package com.project.backend.service;

import com.project.backend.dto.AnalyzeRequest;
import com.project.backend.dto.AnalyzeResponse;
import com.project.backend.dto.UrlRequest;
import com.project.backend.model.AnalysisResult;
import com.project.backend.repository.AnalysisResultRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NewsService {

    private final AiService aiService;
    private final AnalysisResultRepository repository;

    public NewsService(AiService aiService, AnalysisResultRepository repository) {
        this.aiService = aiService;
        this.repository = repository;
    }

    public AnalysisResult analyzeAndSave(AnalyzeRequest request) {
        AnalyzeResponse aiResponse = aiService.analyzeArticle(request);

        AnalysisResult result = new AnalysisResult();
        result.setUserId(request.getUserId());
        result.setTitle(request.getTitle());
        result.setContent(request.getContent());
        result.setPrediction(aiResponse.getPrediction());
        result.setConfidence(aiResponse.getConfidence());
        result.setImportant_words(aiResponse.getImportant_words());
        result.setSummary(aiResponse.getSummary());
        result.setKey_points(aiResponse.getKey_points());
        result.setTopic_tags(aiResponse.getTopic_tags());
        result.setNews_category(aiResponse.getNews_category());
        result.setCurrent_affairs_score(aiResponse.getCurrent_affairs_score());
        result.setCurrent_affairs_label(aiResponse.getCurrent_affairs_label());
        result.setEvent_date_hints(aiResponse.getEvent_date_hints());
        result.setSource_name(aiResponse.getSource_name());
        result.setSource_reliability_score(aiResponse.getSource_reliability_score());
        result.setSource_reliability_label(aiResponse.getSource_reliability_label());
        result.setSource_notes(aiResponse.getSource_notes());
        result.setExtracted_entities(aiResponse.getExtracted_entities());
        result.setMain_claims(aiResponse.getMain_claims());
        result.setSourceType("TEXT");
        result.setCreatedAt(LocalDateTime.now());

        return repository.save(result);
    }

    public AnalysisResult analyzeUrlAndSave(UrlRequest request) {
        AnalyzeResponse aiResponse = aiService.analyzeUrl(request);

        AnalysisResult result = new AnalysisResult();
        result.setUserId(request.getUserId());
        result.setTitle(aiResponse.getTitle());
        result.setContent(aiResponse.getContent());
        result.setPrediction(aiResponse.getPrediction());
        result.setConfidence(aiResponse.getConfidence());
        result.setImportant_words(aiResponse.getImportant_words());
        result.setSummary(aiResponse.getSummary());
        result.setKey_points(aiResponse.getKey_points());
        result.setTopic_tags(aiResponse.getTopic_tags());
        result.setNews_category(aiResponse.getNews_category());
        result.setCurrent_affairs_score(aiResponse.getCurrent_affairs_score());
        result.setCurrent_affairs_label(aiResponse.getCurrent_affairs_label());
        result.setEvent_date_hints(aiResponse.getEvent_date_hints());
        result.setSource_name(aiResponse.getSource_name());
        result.setSource_reliability_score(aiResponse.getSource_reliability_score());
        result.setSource_reliability_label(aiResponse.getSource_reliability_label());
        result.setSource_notes(aiResponse.getSource_notes());
        result.setExtracted_entities(aiResponse.getExtracted_entities());
        result.setMain_claims(aiResponse.getMain_claims());
        result.setSourceType("URL");
        result.setCreatedAt(LocalDateTime.now());

        return repository.save(result);
    }

    public List<AnalysisResult> getAllResultsByUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void deleteResult(String id) {
        repository.deleteById(id);
    }
}
