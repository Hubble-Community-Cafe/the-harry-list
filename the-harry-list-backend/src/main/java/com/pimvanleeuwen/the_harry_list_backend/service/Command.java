package com.pimvanleeuwen.the_harry_list_backend.service;

import org.springframework.http.ResponseEntity;

public interface Command<I, O> {
    ResponseEntity<O> execute(I input);
}
