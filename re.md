Role & Context

Act as a Senior Enterprise System Architect, Principal Backend Developer, and DevOps Expert. You have extensive experience in building highly scalable Point of Sale (POS) systems, SaaS subscription architectures, modern DevOps (Docker/Caddy), and specifically Saudi ZATCA (FATOORA) e-invoicing compliance.

Project Overview

The system is called "ampos". It consists of a backend server and an iPad client application.

Backend Environment: Linux Server (ssh root@206.168.214.225), working directory /home/ampos-backend.

Web Server/Reverse Proxy: Caddy.

E-Invoicing SDK: ZATCA Java SDK (zatca-einvoicing-sdk-Java-238-R3.4.8).

Objectives & Directives

I need you to act as my co-developer to execute the following 5 phases. We will work phase by phase. Do not rush to write all code at once; instead, provide the architecture, ask for specific files you need to see, and then provide the exact code implementations and terminal commands.

Phase 1: Comprehensive System & Logic Analysis

I will share key backend files with you (or you will instruct me on what terminal commands to run in /home/ampos-backend to map the directory structure).

Task: Perform a deep logical and programmatic analysis of the existing backend. Identify any bottlenecks, security vulnerabilities, or anti-patterns.

Output: Provide a refactoring plan and fix any immediate bugs you find in the logic.

Phase 2: Advanced Receipt Printing & Arabic PDF Support (iPad)

The Problem: Current PDF receipts do not support the Arabic language properly on the iPad (RTL issues, disjointed letters).

The Goal: Implement a robust solution for generating Arabic PDFs (e.g., using custom TTF fonts and text-shaping libraries).

Advanced Printing: Design a modern, state-of-the-art printer discovery and connection flow for the iPad (e.g., utilizing Bonjour/mDNS, IPP protocol, or direct network printing) to make adding receipt printers seamless.

Phase 3: Innovative iPad Device Pairing & Activation Flow

Task: Completely redesign the backend logic for connecting and activating iPad POS devices.

Requirement: Invent a highly professional, secure, and user-friendly activation method (e.g., QR Code-based activation, short-lived secure pairing tokens, or device fingerprinting) rather than manual username/password entry for cashiers. Provide the backend endpoints and architecture for this.

Phase 4: SaaS Subscription Management Microservice (Docker & Caddy)

Task: Build a dedicated backend container (Docker) specifically for managing system subscriptions.

Features: A comprehensive dashboard/API to view all subscribers, the number of active iPad devices per subscriber, and full CRUD/management capabilities for tenants.

DevOps: I have created a subdomain super.mydomain.com. Write the exact Caddyfile configuration required to route traffic securely to this new Docker container. Provide the docker-compose.yml for this isolated environment.

Phase 5: ZATCA (FATOORA) E-Invoicing Integration (Professional Level)

Context: I have the official ZATCA Java SDK located at /Users/ahmadalmubarak/Documents/ampos/zatca-einvoicing-sdk-Java-238-R3.4.8.

Task: Architect the integration between the backend and this SDK.

Requirement: Specifically, implement the complex logic for the "Simplified Tax Invoice" (الفاتورة المبسطة) to generate the Base64 TLV (Tag-Length-Value) QR Code exactly according to ZATCA's cryptographic requirements, and attach it to the invoice. Give me step-by-step instructions on how to wrap this Java SDK into our backend flow efficiently.

Execution Rules for Claude

Start by acknowledging these instructions and providing a high-level summary of your approach for all 5 phases.

Tell me exactly what files, folder structures, or code snippets you need me to paste from /home/ampos-backend to begin Phase 1.

For all code provided, ensure it is production-ready, heavily commented, and follows best practices.

When dealing with Arabic text shaping and ZATCA TLV encoding, be extremely precise as these are highly technical.