package com.gym.demo.fee;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);
    private final FeeRepository feeRepository;
    private final ReminderEmailService reminderEmailService;

    public ReminderScheduler(FeeRepository feeRepository, ReminderEmailService reminderEmailService) {
        this.feeRepository = feeRepository;
        this.reminderEmailService = reminderEmailService;
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void sendDueReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        feeRepository.findAll().stream()
                .filter(fee -> !fee.isPaid() && fee.getDueDate().equals(tomorrow))
            .forEach(fee -> {
                log.info("Payment reminder: {} owes {} on {}",
                    fee.getClient().getFirstName() + " " + fee.getClient().getLastName(),
                    fee.getAmount(), fee.getDueDate());
                reminderEmailService.sendReminder(fee);
            });
    }
}