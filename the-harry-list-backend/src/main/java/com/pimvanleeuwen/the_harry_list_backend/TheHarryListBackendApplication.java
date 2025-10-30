package com.pimvanleeuwen.the_harry_list_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties
@SpringBootApplication
public class TheHarryListBackendApplication {

	public static void main(String[] args) {
        SpringApplication.run(TheHarryListBackendApplication.class, args);
	}

}
