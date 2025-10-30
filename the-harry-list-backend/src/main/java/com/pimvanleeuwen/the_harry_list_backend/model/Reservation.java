package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

@Data
@Entity
@Table(name = "reservation")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private long id;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;

    @Column(name = "phoneNumber")
    private String phoneNumber;

    @Column(name = "numberOfGuests")
    private int numberOfGuests;

    @Column(name = "title")
    private String title;

    @Column(name = "startDate")
    private Date startDate;

    @Column(name = "endDate")
    private Date endDate;

    @Column(name = "location")
    @Enumerated(EnumType.STRING)
    private BarLocation location;

    @Column(name = "drinkType")
    @Enumerated(EnumType.STRING)
    private DrinkType drinkType;

    @Column(name = "drinkGoal")
    @Enumerated(EnumType.STRING)
    private DrinkGoal drinkGoal;

    @Column(name = "paymentOption")
    @Enumerated(EnumType.STRING)
    private PaymentOption paymentOption;

    @Column(name = "costCenter")
    private String costCenter;

    @Column(name = "invoiceName")
    private String invoiceName;

    @Column(name = "invoiceAddress")
    private String invoiceAddress;

    @Column(name = "foodOptions")
    private String foodOptions;

    @Column(name = "description")
    private String description;



}
