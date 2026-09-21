package com.gym.demo.fee;

import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class ReminderEmailService {

    private static final Logger log = LoggerFactory.getLogger(ReminderEmailService.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMMM d, yyyy");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public ReminderEmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendReminder(Fee fee) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Skipping payment reminder for fee {} because SMTP is not configured", fee.getId());
            return;
        }

        String clientName = fee.getClient().getFirstName() + " " + fee.getClient().getLastName();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(fee.getClient().getEmail());
        message.setSubject("Gym membership renewal reminder");
        message.setText("Hi " + clientName + ",\n\n"
                + "This is a reminder that your gym membership payment of " + fee.getAmount()
                + " is due on " + fee.getDueDate().format(DATE_FORMAT) + ".\n\n"
                + "Please contact the gym if you have any questions.");

        try {
            mailSender.send(message);
            log.info("Sent payment reminder to {} for fee {}", fee.getClient().getEmail(), fee.getId());
        } catch (RuntimeException exception) {
            log.error("Could not send payment reminder to {} for fee {}",
                    fee.getClient().getEmail(), fee.getId(), exception);
        }
    }
}