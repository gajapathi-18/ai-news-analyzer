from collections import Counter
from html import unescape
from html.parser import HTMLParser
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

try:
    model = joblib.load("models/fake_news_model.pkl")
    vectorizer = joblib.load("models/vectorizer.pkl")
except Exception as error:
    raise RuntimeError(
        "Failed to load local model files. "
        "The saved model/vectorizer may be corrupted or partially written. "
        "Please rerun 'python train_model.py' and restart the AI service."
    ) from error

CURRENT_YEAR = 2026
MONTH_NAMES = {
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
}
CATEGORY_KEYWORDS = {
    "Politics": {"government", "parliament", "minister", "election", "policy", "cabinet", "party"},
    "Law": {"court", "judge", "legal", "law", "verdict", "hearing", "petition", "tribunal"},
    "Economy": {"economy", "inflation", "market", "finance", "bank", "trade", "budget", "tax"},
    "World": {"international", "global", "diplomatic", "foreign", "border", "summit", "country"},
    "Technology": {"technology", "ai", "software", "startup", "chip", "digital", "cyber", "internet"},
    "Health": {"health", "hospital", "medical", "vaccine", "disease", "patient", "public health"},
    "Education": {"education", "school", "university", "student", "exam", "campus", "teacher"},
    "Environment": {"climate", "pollution", "weather", "forest", "energy", "carbon", "environment"},
    "Sports": {"match", "tournament", "league", "player", "coach", "team", "championship"},
}
STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "from", "have", "were", "their", "they", "said",
    "will", "into", "after", "about", "more", "than", "been", "over", "under", "while", "where",
    "when", "which", "also", "such", "them", "into", "through", "across", "between", "because",
    "could", "would", "should", "against", "there", "here", "your", "news", "latest", "article",
    "articles", "india", "indian", "today", "just", "only", "have", "has", "had",
}
ENTITY_STOP_WORDS = STOP_WORDS | {
    "court", "news", "article", "latest", "india", "government", "state", "union",
}
REPUTABLE_SOURCES = {
    "indianexpress.com",
    "thehindu.com",
    "hindustantimes.com",
    "livemint.com",
    "bbc.com",
    "reuters.com",
    "apnews.com",
    "ndtv.com",
    "economictimes.indiatimes.com",
    "theprint.in",
    "barandbench.com",
    "livelaw.in",
}
LOW_QUALITY_SIGNAL_TERMS = {
    "shocking", "unbelievable", "viral", "you won't believe", "must watch",
    "click here", "share this", "subscribe now", "breaking!!!",
}
NEWS_URL_HINTS = {
    "/news", "/article", "/articles", "/world", "/india", "/politics", "/legal-news",
    "/technology", "/tech", "/business", "/economy", "/sports", "/health", "/education",
}
NON_NEWS_URL_HINTS = {
    "/about", "/contact", "/privacy", "/terms", "/careers", "/subscribe", "/login",
    "/register", "/category", "/tag", "/tags", "/search", "/photos", "/videos", "/reels",
}


class NewsRequest(BaseModel):
    title: str
    content: str


class UrlRequest(BaseModel):
    url: str


class ArticleHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.skip_depth = 0
        self.title_parts = []
        self.candidate_blocks = []
        self.current_block = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True

        if tag in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1

        if tag in {"article", "p", "h1", "h2", "h3", "li", "div", "section"}:
            self.current_block.append("")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

        if tag in {"script", "style", "noscript", "svg"} and self.skip_depth > 0:
            self.skip_depth -= 1

        if tag in {"article", "p", "h1", "h2", "h3", "li", "div", "section"} and self.current_block:
            block = self.current_block.pop()
            cleaned = " ".join(block.split())
            if cleaned:
                self.candidate_blocks.append(cleaned)

    def handle_data(self, data):
        if self.skip_depth > 0:
            return

        cleaned = " ".join(data.split())
        if not cleaned:
            return

        if self.in_title:
            self.title_parts.append(cleaned)

        if self.current_block:
            self.current_block[-1] = f"{self.current_block[-1]} {cleaned}".strip()


def clean_extracted_text(text: str):
    cleaned = unescape(text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"(?i)\b(skip to content|subscribe|sign in|advertisement|follow us|read more)\b", " ", cleaned)
    cleaned = re.sub(r"\b[A-Z]{2,}\b", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def select_article_blocks(blocks):
    filtered_blocks = []

    for block in blocks:
        lowered = block.lower()
        if len(block.split()) < 8:
            continue
        if lowered.count("cookie") > 0 or lowered.count("advertisement") > 0:
            continue
        if lowered.count("subscribe") > 1 or lowered.count("sign in") > 1:
            continue
        filtered_blocks.append(block)

    return filtered_blocks


def split_sentences(text: str):
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if len(sentence.strip()) > 40
    ]


def shorten_text(text: str, max_length: int):
    cleaned = " ".join(str(text).split()).strip()
    if len(cleaned) <= max_length:
        return cleaned

    shortened = cleaned[:max_length].rsplit(" ", 1)[0].strip()
    return f"{shortened}..." if shortened else f"{cleaned[:max_length].strip()}..."


def detect_category(text: str):
    lowered = text.lower()
    category_scores = {
        category: sum(1 for keyword in keywords if keyword in lowered)
        for category, keywords in CATEGORY_KEYWORDS.items()
    }
    best_category = max(category_scores, key=category_scores.get)
    return best_category if category_scores[best_category] > 0 else "General Current Affairs"


def detect_topic_tags(title: str, content: str, important_words):
    words = re.findall(r"[A-Za-z][A-Za-z\-]{2,}", f"{title} {content}".lower())
    filtered = [word for word in words if word not in STOP_WORDS]
    common_words = [word.title() for word, _ in Counter(filtered).most_common(6)]
    tags = []

    for word in important_words:
        pretty_word = word.replace("_", " ").title()
        if pretty_word not in tags:
            tags.append(pretty_word)

    for word in common_words:
        if word not in tags:
            tags.append(word)

    return tags[:6]


def extract_entities(title: str, content: str):
    text = f"{title}. {content}"
    matches = re.findall(r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b", text)
    entities = []

    for match in matches:
        cleaned = " ".join(match.split()).strip(" ,.-")
        normalized = cleaned.lower()
        if len(cleaned) < 3:
            continue
        if normalized in ENTITY_STOP_WORDS:
            continue
        if cleaned.isupper() and len(cleaned) <= 2:
            continue
        if cleaned not in entities:
            entities.append(cleaned)

    return entities[:8]


def extract_date_hints(text: str):
    matches = re.findall(
        r"\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|"
        r"sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b",
        text,
        flags=re.IGNORECASE,
    )
    hints = []

    for match in matches:
        cleaned = " ".join(match.split())
        if cleaned not in hints:
            hints.append(cleaned)

    year_matches = re.findall(r"\b(202[4-6])\b", text)
    for year in year_matches:
        if year not in hints:
            hints.append(year)

    return hints[:4]


def compute_current_affairs_score(title: str, content: str, date_hints):
    text = f"{title} {content}".lower()
    score = 35

    if date_hints:
        score += 18

    if str(CURRENT_YEAR) in text or str(CURRENT_YEAR - 1) in text:
        score += 12

    if any(month in text for month in MONTH_NAMES):
        score += 8

    if any(keyword in text for keyword in {
        "today", "yesterday", "this week", "breaking", "announced", "reported",
        "hearing", "verdict", "approved", "ordered", "released", "launch",
    }):
        score += 12

    if any(keyword in text for keyword in {
        "government", "supreme court", "high court", "minister", "commission",
        "parliament", "police", "court", "cabinet", "agency",
    }):
        score += 10

    return min(score, 100)


def score_label(score: int):
    if score >= 75:
        return "High current-affairs relevance"
    if score >= 55:
        return "Moderate current-affairs relevance"
    return "Low current-affairs relevance"


def build_summary(sentences):
    if not sentences:
        return "No clear summary available from the extracted article."

    primary_sentences = " ".join(sentences[:2])
    return shorten_text(primary_sentences, 220)


def build_key_points(sentences):
    return [shorten_text(sentence, 110) for sentence in sentences[:3]]


def extract_main_claims(sentences):
    claim_markers = (
        "said", "announced", "ordered", "reported", "alleged", "claimed",
        "told", "approved", "issued", "ruled", "found", "stated",
    )
    ranked_sentences = [
        sentence
        for sentence in sentences
        if any(marker in sentence.lower() for marker in claim_markers)
    ] or sentences
    return [shorten_text(sentence, 120) for sentence in ranked_sentences[:3]]


def source_name_from_url(url: str):
    hostname = urlparse(url).netloc.lower()
    hostname = hostname.replace("www.", "")
    if not hostname:
        return "Direct Input"
    return hostname


def score_source_reliability(source_url: str | None, content: str):
    source_name = source_name_from_url(source_url) if source_url else "Direct Input"
    lowered_content = content.lower()
    score = 58 if source_url else 45
    notes = []

    if source_name in REPUTABLE_SOURCES:
        score += 28
        notes.append("Known mainstream or established publication source.")
    elif source_url:
        notes.append("Source is not yet in the trusted-publication allowlist.")
    else:
        notes.append("No publisher domain was provided for this analysis.")

    if any(term in lowered_content for term in LOW_QUALITY_SIGNAL_TERMS):
        score -= 18
        notes.append("The article includes sensational language patterns.")
    else:
        notes.append("The article avoids many common low-quality clickbait terms.")

    if len(split_sentences(content)) >= 5:
        score += 8
        notes.append("The article has enough structured reporting text for evaluation.")

    score = max(15, min(score, 98))

    if score >= 80:
        label = "High source reliability"
    elif score >= 60:
        label = "Moderate source reliability"
    else:
        label = "Low source reliability"

    return score, label, notes[:3]


def is_news_like_article(title: str, content: str, source_url: str | None):
    combined_text = f"{title} {content}".lower()
    parsed_url = urlparse(source_url) if source_url else None
    path = (parsed_url.path or "").lower() if parsed_url else ""

    if any(hint in path for hint in NON_NEWS_URL_HINTS):
        return False

    url_score = 0
    if any(hint in path for hint in NEWS_URL_HINTS):
        url_score += 2
    if re.search(r"/\d{5,}", path):
        url_score += 2
    if len(path.split("-")) >= 4:
        url_score += 1

    content_score = 0
    if len(split_sentences(content)) >= 3:
        content_score += 2
    if len(content.split()) >= 180:
        content_score += 2
    if any(keyword in combined_text for keyword in {
        "court", "government", "minister", "police", "report", "hearing", "verdict",
        "announced", "according to", "statement", "official", "supreme court",
    }):
        content_score += 2
    if any(month in combined_text for month in MONTH_NAMES):
        content_score += 1

    title_score = 0
    if len(title.split()) >= 6:
        title_score += 1
    if re.search(r"\b(says|orders|hears|issues|announces|rules|report|reports)\b", title.lower()):
        title_score += 1

    return (url_score + content_score + title_score) >= 4


def apply_source_adjustment(label: str, confidence: float, source_url: str | None, text: str):
    if not source_url:
        return label, confidence

    source_name = source_name_from_url(source_url)
    lowered = text.lower()

    if source_name in REPUTABLE_SOURCES and label == "FAKE" and confidence < 0.78:
        label = "REAL"
        confidence = min(0.72, max(confidence, 0.56))

    if any(term in lowered for term in LOW_QUALITY_SIGNAL_TERMS) and label == "REAL" and confidence < 0.70:
        label = "FAKE"
        confidence = min(0.68, max(confidence, 0.55))

    return label, confidence


def build_analysis_payload(title: str, content: str, source_url: str | None = None):
    text = f"{title} {content}".strip()

    if source_url and not is_news_like_article(title, content, source_url):
        raise HTTPException(
            status_code=422,
            detail="This URL does not appear to be a news article. Please enter a valid news URL.",
        )

    vec = vectorizer.transform([text])

    prediction = model.predict(vec)[0]
    decision = model.decision_function(vec)[0]
    confidence = float(abs(decision) / 2)
    label = "REAL" if prediction == 1 else "FAKE"
    label, confidence = apply_source_adjustment(label, confidence, source_url, text)

    feature_names = vectorizer.get_feature_names_out()
    vec_array = vec.toarray()[0]
    important_words = []

    for index in np.argsort(vec_array)[::-1][:10]:
        if vec_array[index] > 0:
            important_words.append(feature_names[index])

    sentences = split_sentences(content)
    category = detect_category(f"{title} {content}")
    date_hints = extract_date_hints(f"{title} {content}")
    current_affairs_score = compute_current_affairs_score(title, content, date_hints)
    topic_tags = detect_topic_tags(title, content, important_words)
    source_reliability_score, source_reliability_label, source_notes = score_source_reliability(
        source_url,
        content,
    )
    extracted_entities = extract_entities(title, content)
    main_claims = extract_main_claims(sentences)

    return {
        "title": title,
        "content": content,
        "prediction": label,
        "confidence": confidence,
        "important_words": important_words,
        "summary": build_summary(sentences),
        "key_points": build_key_points(sentences),
        "topic_tags": topic_tags,
        "news_category": category,
        "current_affairs_score": current_affairs_score,
        "current_affairs_label": score_label(current_affairs_score),
        "event_date_hints": date_hints,
        "source_name": source_name_from_url(source_url) if source_url else "Direct Input",
        "source_reliability_score": source_reliability_score,
        "source_reliability_label": source_reliability_label,
        "source_notes": source_notes,
        "extracted_entities": extracted_entities,
        "main_claims": main_claims,
    }


def extract_article_text(html: str):
    parser = ArticleHTMLParser()
    parser.feed(html)

    title = clean_extracted_text(" ".join(parser.title_parts).strip())
    filtered_blocks = select_article_blocks(parser.candidate_blocks)
    body_text = clean_extracted_text(" ".join(filtered_blocks))

    if not title:
        title_match = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        if title_match:
            title = clean_extracted_text(title_match.group(1))

    if not body_text:
        raise HTTPException(status_code=422, detail="Could not extract readable content from the URL.")

    sentences = split_sentences(body_text)
    if sentences:
        body_text = " ".join(sentences[:12])

    if len(body_text) > 5000:
        body_text = body_text[:5000]

    return title or "Untitled Article", body_text


def fetch_article(url: str):
    try:
        request = Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/123.0.0.0 Safari/537.36"
                )
            },
        )
        with urlopen(request, timeout=15) as response:
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                raise HTTPException(status_code=422, detail="The provided URL did not return an HTML page.")

            charset = response.headers.get_content_charset() or "utf-8"
            html = response.read().decode(charset, errors="ignore")
            return extract_article_text(html)
    except HTTPException:
        raise
    except HTTPError as error:
        raise HTTPException(
            status_code=error.code,
            detail=f"Could not fetch the URL. Remote server returned HTTP {error.code}.",
        ) from error
    except URLError as error:
        raise HTTPException(
            status_code=422,
            detail=f"Could not fetch the URL: {error.reason}",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Failed to process the article URL.",
        ) from error


@app.post("/ai/analyze")
def analyze_news(request: NewsRequest):
    return build_analysis_payload(request.title, request.content)


@app.post("/ai/analyze-url")
def analyze_news_url(request: UrlRequest):
    title, content = fetch_article(request.url)
    return build_analysis_payload(title, content, request.url)
