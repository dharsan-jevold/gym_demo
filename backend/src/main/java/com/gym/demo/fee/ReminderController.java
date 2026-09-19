package com.gym.demo.fee;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final FeeRepository feeRepository;

    public ReminderController(FeeRepository feeRepository) {
        this.feeRepository = feeRepository;
    }

    @GetMapping
    public List<ReminderResponse> getReminders() {
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusDays(7);
        return feeRepository.findAll().stream()
                .filter(fee -> !fee.isPaid() && !fee.getDueDate().isAfter(horizon))
                .sorted((left, right) -> left.getDueDate().compareTo(right.getDueDate()))
                .map(fee -> ReminderResponse.from(fee, today))
                .toList();
    }
}