package com.gym.demo.dashboard;

import java.util.Locale;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gym.demo.fee.Fee;
import com.gym.demo.fee.FeeRepository;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final FeeRepository feeRepository;

    public ReportController(FeeRepository feeRepository) {
        this.feeRepository = feeRepository;
    }

    @GetMapping(value = "/fees.csv", produces = "text/csv")
    public ResponseEntity<String> feesCsv() {
        StringBuilder csv = new StringBuilder("Client,Amount,Due date,Status\n");
        for (Fee fee : feeRepository.findAll()) {
            String client = fee.getClient().getFirstName() + " " + fee.getClient().getLastName();
            String status = fee.isPaid() ? "Paid" : fee.getDueDate().isBefore(java.time.LocalDate.now()) ? "Overdue" : "Unpaid";
            csv.append(csvValue(client)).append(',')
                    .append(String.format(Locale.ROOT, "%.2f", fee.getAmount())).append(',')
                    .append(fee.getDueDate()).append(',')
                    .append(status).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fee-report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    private String csvValue(String value) {
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}