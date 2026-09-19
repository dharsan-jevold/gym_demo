package com.gym.demo.fee;

import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gym.demo.client.Client;
import com.gym.demo.client.ClientRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/fees")
public class FeeController {

    private final FeeRepository feeRepository;
    private final ClientRepository clientRepository;

    public FeeController(FeeRepository feeRepository, ClientRepository clientRepository) {
        this.feeRepository = feeRepository;
        this.clientRepository = clientRepository;
    }

    @GetMapping
    public List<FeeResponse> getAllFees() {
        return feeRepository.findAll().stream().map(FeeResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<FeeResponse> createFee(@Valid @RequestBody FeeRequest request) {
        Client client = clientRepository.findById(Objects.requireNonNull(request.clientId()))
                .orElseThrow(() -> new ResourceNotFoundException("Client was not found"));
        Fee savedFee = feeRepository.save(new Fee(client, request.amount(), request.dueDate(), request.paid()));
        return ResponseEntity.status(HttpStatus.CREATED).body(FeeResponse.from(savedFee));
    }

    @PutMapping("/{id}")
    public FeeResponse updateFee(@PathVariable long id, @Valid @RequestBody FeeUpdateRequest request) {
        Fee fee = feeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Fee was not found"));
        fee.setAmount(request.amount());
        fee.setDueDate(request.dueDate());
        fee.setPaid(request.paid());
        return FeeResponse.from(feeRepository.save(fee));
    }

    @PatchMapping("/{id}/payment")
    public FeeResponse updatePayment(@PathVariable long id, @RequestBody PaymentRequest request) {
        Fee fee = feeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Fee was not found"));
        fee.setPaid(request.paid());
        return FeeResponse.from(feeRepository.save(fee));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFee(@PathVariable long id) {
        if (!feeRepository.existsById(id)) throw new ResourceNotFoundException("Fee was not found");
        feeRepository.deleteById(id);
    }

    public record PaymentRequest(boolean paid) { }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    private static class ResourceNotFoundException extends RuntimeException {
        ResourceNotFoundException(String message) { super(message); }
    }
}
