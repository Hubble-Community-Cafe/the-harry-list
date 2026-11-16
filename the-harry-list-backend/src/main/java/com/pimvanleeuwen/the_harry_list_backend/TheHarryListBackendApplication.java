package com.pimvanleeuwen.the_harry_list_backend;

import org.springframework.boot.SpringApplication;
import com.pimvanleeuwen.the_harry_list_backend.config.properties.AltchaProperties;
import com.pimvanleeuwen.the_harry_list_backend.config.properties.AppMailProperties;
import com.pimvanleeuwen.the_harry_list_backend.config.properties.AzureProperties;
import com.pimvanleeuwen.the_harry_list_backend.config.properties.CalendarFeedProperties;
import com.pimvanleeuwen.the_harry_list_backend.config.properties.CorsProperties;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

// Typed settings. Registered here (not by scanning) so @WebMvcTest slices get them as well.
@EnableConfigurationProperties({AppMailProperties.class, CalendarFeedProperties.class,
        AzureProperties.class, CorsProperties.class, AltchaProperties.class})
@EnableScheduling
@SpringBootApplication
public class TheHarryListBackendApplication {

	public static void main(String[] args) {
        SpringApplication.run(TheHarryListBackendApplication.class, args);
	}

}
