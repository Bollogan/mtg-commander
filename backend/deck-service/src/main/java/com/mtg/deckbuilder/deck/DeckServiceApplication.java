package com.mtg.deckbuilder.deck;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class DeckServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DeckServiceApplication.class, args);
    }

}
