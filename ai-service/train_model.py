import re
from pathlib import Path
import os

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "fake_news_model.pkl"
VECTORIZER_PATH = MODELS_DIR / "vectorizer.pkl"


def atomic_joblib_dump(obj, destination: Path):
    temp_path = destination.with_suffix(destination.suffix + ".tmp")
    joblib.dump(obj, temp_path, compress=3)
    os.replace(temp_path, destination)


def clean_training_text(text: str):
    text = "" if pd.isna(text) else str(text)
    text = text.lower()
    text = re.sub(r"http\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s.,!?'-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Load datasets
fake = pd.read_csv("Fake.csv")
true = pd.read_csv("True.csv")

fake["label"] = 0
true["label"] = 1

# Keep only the fields we need and shuffle
data = pd.concat([fake, true], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)

# Combine title + text with cleanup
data["content"] = (
    data["title"].apply(clean_training_text) + " " + data["text"].apply(clean_training_text)
).str.strip()
data = data[data["content"].str.len() > 80].reset_index(drop=True)

X = data["content"]
y = data["label"]

# Convert text to numerical vectors
vectorizer = TfidfVectorizer(
    stop_words="english",
    max_df=0.75,
    min_df=3,
    sublinear_tf=True,
    strip_accents="unicode",
    ngram_range=(1, 2),
    max_features=60000,
)

X_vec = vectorizer.fit_transform(X)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X_vec,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

# Train model
model = LogisticRegression(
    max_iter=2000,
    class_weight="balanced",
    C=1.5,
    solver="liblinear",
)
model.fit(X_train, y_train)

# Accuracy and class-level check
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred, target_names=["FAKE", "REAL"]))

# Save model
MODELS_DIR.mkdir(parents=True, exist_ok=True)
print("Saving model...")
atomic_joblib_dump(model, MODEL_PATH)
print("Saving vectorizer...")
atomic_joblib_dump(vectorizer, VECTORIZER_PATH)
print("Done")
print("Model retrained and saved!")

