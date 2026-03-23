package com.project.backend.controller;

import com.project.backend.dto.AnalyzeRequest;
import com.project.backend.dto.UrlRequest;
import com.project.backend.model.AnalysisResult;
import com.project.backend.service.NewsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = "http://localhost:3000")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @PostMapping("/analyze")
    public AnalysisResult analyzeNews(@RequestBody AnalyzeRequest request) {
        return newsService.analyzeAndSave(request);
    }

    @PostMapping("/analyze-url")
    public AnalysisResult analyzeNewsUrl(@RequestBody UrlRequest request) {
        return newsService.analyzeUrlAndSave(request);
    }

    @GetMapping("/history")
    public List<AnalysisResult> getHistory(@RequestParam String userId) {
        return newsService.getAllResultsByUser(userId);
    }

    @DeleteMapping("/{id}")
    public void deleteResult(@PathVariable String id) {
        newsService.deleteResult(id);
    }
}