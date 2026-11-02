Brightloop – Subscription Management System
Brightloop is a web-based subscription management system designed to make it easier for businesses to manage their products, customers, subscriptions, invoices and payments in one place. The idea behind this project is simple: instead of handling subscriptions and billing manually, businesses can manage everything through a single platform.

What can you do with Brightloop?
Dashboard: Get an overview of revenue, subscriptions and outstanding payments.
Products & Plans: Create products, manage variants and set up subscription plans.
Customers: Manage customer information.
Subscriptions: Create, track, pause and resume subscriptions.
Quotations: Create reusable quotation templates.
Invoices: Generate and manage customer invoices.
Payments: Record payments and track outstanding balances.
Taxes & Discounts: Configure taxes and apply discounts.
Staff Management: Manage staff accounts and access.
Customer Portal: Allow customers to view their subscriptions, invoices and payment history.
Automated Billing: Generate recurring invoices through scheduled billing.

User Roles
Admin: Has access to manage the entire system.
Staff: Handles customers, subscriptions, invoices and payments.
Customer: Can access their own subscription and billing information.

Tech Stack
Frontend: React.js, Vite
Backend: Node.js, Express.js
Database: MongoDB, Mongoose
Authentication: JWT and bcrypt
Email: Nodemailer and Brevo SMTP
Other: Axios, Zod, Node-Cron

Project Goal
The goal of Brightloop is to simplify subscription management and reduce the manual effort involved in handling recurring billing, customer information and payments. Built as a project to explore how a real-world subscription-based business platform works.

Prerequisites
Node.js and npm
MongoDB running locally or a MongoDB connection URI

Installation
Clone the repository:
git clone https://github.com/aamalrxj/Brightloop-Subscription-Manager.git
cd Brightloop-Subscription-Manager

Install backend dependencies:
cd server
npm install

Create a .env file inside the server folder:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/brightloop
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
BILLING_CRON_ENABLED=true

Configure SMTP environment variables if you want to use email functionality.
Start the backend:
npm run dev

Open another terminal and install frontend dependencies:
cd client
npm install

Start the frontend:
npm run dev

Video Link: https://drive.google.com/file/d/1HMOt34bUDo462RGQB-iiAednr2PkcHdM/view
Video Folder: https://drive.google.com/drive/folders/1yMZTkIWYpMpSzu-uht_sGjZ0hKHJS_Ly?usp=drive_link
