package com.gym.demo.fee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FeeResponse(Long id, Long clientId, String clientName, BigDecimal amount,
                          LocalDate dueDate, boolean paid, LocalDate paidDate) {
    public static FeeResponse from(Fee fee) {
        return new FeeResponse(fee.getId(), fee.getClient().getId(),
                fee.getClient().getFirstName() + " " + fee.getClient().getLastName(),
                fee.getAmount(), fee.getDueDate(), fee.isPaid(), fee.getPaidDate());
    }
}
