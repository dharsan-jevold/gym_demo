package com.gym.demo.fee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ReminderResponse(Long feeId, Long clientId, String clientName,
                               BigDecimal amount, LocalDate dueDate, long daysUntilDue) {
    public static ReminderResponse from(Fee fee, LocalDate today) {
        return new ReminderResponse(fee.getId(), fee.getClient().getId(),
                fee.getClient().getFirstName() + " " + fee.getClient().getLastName(),
                fee.getAmount(), fee.getDueDate(), fee.getDueDate().toEpochDay() - today.toEpochDay());
    }
}