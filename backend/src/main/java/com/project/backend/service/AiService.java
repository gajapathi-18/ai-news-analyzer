package com.project.backend.service;

import com.project.backend.dto.AnalyzeRequest;
import com.project.backend.dto.AnalyzeResponse;
import com.project.backend.dto.UrlRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();

    public AnalyzeResponse analyzeArticle(AnalyzeRequest request) {
        String aiUrl = "http://localhost:8000/ai/analyze";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<AnalyzeRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<AnalyzeResponse> response = restTemplate.exchange(
                aiUrl,
                HttpMethod.POST,
                entity,
                AnalyzeResponse.class
        );

        return response.getBody();
    }

    public AnalyzeResponse analyzeUrl(UrlRequest request) {
        String aiUrl = "http://localhost:8000/ai/analyze-url";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<UrlRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<AnalyzeResponse> response = restTemplate.exchange(
                aiUrl,
                HttpMethod.POST,
                entity,
                AnalyzeResponse.class
        );

        return response.getBody();
    }
}