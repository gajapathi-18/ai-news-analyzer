package com.project.backend.dto;

import java.util.List;

public class AnalyzeResponse {

    private String title;
    private String content;
    private String prediction;
    private double confidence;
    private List<String> important_words;
    private String summary;
    private List<String> key_points;
    private List<String> topic_tags;
    private String news_category;
    private int current_affairs_score;
    private String current_affairs_label;
    private List<String> event_date_hints;
    private String source_name;
    private int source_reliability_score;
    private String source_reliability_label;
    private List<String> source_notes;
    private List<String> extracted_entities;
    private List<String> main_claims;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getPrediction() {
        return prediction;
    }

    public void setPrediction(String prediction) {
        this.prediction = prediction;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public List<String> getImportant_words() {
        return important_words;
    }

    public void setImportant_words(List<String> important_words) {
        this.important_words = important_words;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getKey_points() {
        return key_points;
    }

    public void setKey_points(List<String> key_points) {
        this.key_points = key_points;
    }

    public List<String> getTopic_tags() {
        return topic_tags;
    }

    public void setTopic_tags(List<String> topic_tags) {
        this.topic_tags = topic_tags;
    }

    public String getNews_category() {
        return news_category;
    }

    public void setNews_category(String news_category) {
        this.news_category = news_category;
    }

    public int getCurrent_affairs_score() {
        return current_affairs_score;
    }

    public void setCurrent_affairs_score(int current_affairs_score) {
        this.current_affairs_score = current_affairs_score;
    }

    public String getCurrent_affairs_label() {
        return current_affairs_label;
    }

    public void setCurrent_affairs_label(String current_affairs_label) {
        this.current_affairs_label = current_affairs_label;
    }

    public List<String> getEvent_date_hints() {
        return event_date_hints;
    }

    public void setEvent_date_hints(List<String> event_date_hints) {
        this.event_date_hints = event_date_hints;
    }

    public String getSource_name() {
        return source_name;
    }

    public void setSource_name(String source_name) {
        this.source_name = source_name;
    }

    public int getSource_reliability_score() {
        return source_reliability_score;
    }

    public void setSource_reliability_score(int source_reliability_score) {
        this.source_reliability_score = source_reliability_score;
    }

    public String getSource_reliability_label() {
        return source_reliability_label;
    }

    public void setSource_reliability_label(String source_reliability_label) {
        this.source_reliability_label = source_reliability_label;
    }

    public List<String> getSource_notes() {
        return source_notes;
    }

    public void setSource_notes(List<String> source_notes) {
        this.source_notes = source_notes;
    }

    public List<String> getExtracted_entities() {
        return extracted_entities;
    }

    public void setExtracted_entities(List<String> extracted_entities) {
        this.extracted_entities = extracted_entities;
    }

    public List<String> getMain_claims() {
        return main_claims;
    }

    public void setMain_claims(List<String> main_claims) {
        this.main_claims = main_claims;
    }
}
