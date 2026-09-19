package com.gym.demo.client;

import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gym.demo.fee.FeeRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientRepository clientRepository;
    private final FeeRepository feeRepository;

    public ClientController(ClientRepository clientRepository, FeeRepository feeRepository) {
        this.clientRepository = clientRepository;
        this.feeRepository = feeRepository;
    }

    @GetMapping
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Client> createClient(@Valid @RequestBody Client client) {
        Client savedClient = clientRepository.save(Objects.requireNonNull(client));
        return ResponseEntity.status(HttpStatus.CREATED).body(savedClient);
    }

    @PutMapping("/{id}")
    public Client updateClient(@PathVariable long id, @Valid @RequestBody Client incoming) {
        Client client = clientRepository.findById(id).orElseThrow(() -> new ClientNotFoundException(id));
        client.setFirstName(incoming.getFirstName());
        client.setLastName(incoming.getLastName());
        client.setEmail(incoming.getEmail());
        client.setPhone(incoming.getPhone());
        client.setJoinDate(incoming.getJoinDate());
        client.setMembershipPlan(incoming.getMembershipPlan());
        client.setMonthlyFee(incoming.getMonthlyFee());
        return clientRepository.save(client);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClient(@PathVariable long id) {
        if (!clientRepository.existsById(id)) throw new ClientNotFoundException(id);
        feeRepository.deleteAll(Objects.requireNonNull(feeRepository.findByClientId(id)));
        clientRepository.deleteById(id);
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    private static class ClientNotFoundException extends RuntimeException {
        ClientNotFoundException(Long id) { super("Client " + id + " was not found"); }
    }
}
