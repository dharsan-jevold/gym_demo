package com.gym.demo.dashboard;

import com.gym.demo.fee.FeeResponse;
import com.gym.demo.fee.FeeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final FeeRepository feeRepository;

    public DashboardController(FeeRepository feeRepository) {
        this.feeRepository = feeRepository;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboard() {
        var fees = feeRepository.findAll();

        long paid = fees.stream().filter(fee -> fee.isPaid()).count();
        long unpaid = fees.stream().filter(fee -> !fee.isPaid()).count();
        long upcoming = fees.stream().filter(fee -> !fee.isPaid() && fee.getDueDate().isAfter(LocalDate.now())).count();

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("paid", paid);
        dashboard.put("unpaid", unpaid);
        dashboard.put("upcoming", upcoming);
        dashboard.put("fees", fees.stream().map(FeeResponse::from).toList());

        return dashboard;
    }
}
