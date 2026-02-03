# King's POS - Point of Sale System

A comprehensive, modern Point of Sale (POS) system designed for retail stores to streamline operations, manage inventory, track sales, and grow their business.

## Purpose

King's POS is built to empower retail store owners and managers with a powerful, easy-to-use system that handles all aspects of retail operations. Whether you're running a small boutique or managing multiple store locations, this POS system provides the tools you need to:

- Process sales quickly and efficiently
- Track inventory in real-time
- Manage customer relationships
- Monitor business performance
- Make data-driven decisions

The system is designed with both online and offline capabilities, ensuring your business never stops even when internet connectivity is limited.

## Key Features

### 💰 Point of Sale
- Fast and intuitive checkout interface
- Barcode scanning support
- Multiple payment methods (cash, card, credit)
- Receipt printing and email
- Discount and tax calculations
- Split payments and change calculation

### 📦 Inventory Management
- Real-time stock tracking
- Low stock alerts
- Product categorization
- Barcode generation and scanning
- Bulk import/export capabilities
- Purchase order management
- Supplier tracking

### 👥 Customer Management
- Customer database with purchase history
- Loyalty program with points and tiers
- Buy now, pay later (credit) system
- Customer rewards and redemptions
- Spending analytics

### 📊 Analytics & Reports
- Sales reports (daily, weekly, monthly, yearly)
- Revenue and profit tracking
- Top-selling products analysis
- Customer spending insights
- Employee performance metrics
- Custom report builder
- Export capabilities (CSV, JSON)

### 🏪 Multi-Store Management
- Centralized control panel
- Cross-store reporting
- Consolidated analytics
- Store performance comparison
- Individual store settings

### 👔 Employee Management
- Role-based access control (Owner, Manager, Cashier, Staff)
- Shift scheduling and tracking
- Clock in/out system
- Employee performance monitoring
- Individual sales tracking

### 🎨 Customization
- Custom store branding with logo upload
- Multi-currency support
- Configurable tax rates
- Theme options (Light, Dark, Auto)
- Product categories with color coding

### 🔧 Advanced Features
- **Workflows**: Automate repetitive tasks
- **Plugins**: Extend functionality
- **Audit Logs**: Track all system changes
- **Permissions**: Granular access control
- **Notifications**: Real-time alerts for important events
- **Stock Optimization**: ABC analysis for inventory

### 🔄 Sync & Offline Support
- Offline-first architecture
- IndexedDB for local storage
- Real-time synchronization with Socket.io
- Works without internet connection
- Auto-sync when connection restored

## Technology Stack

### Frontend
- **React 19** - Modern UI framework
- **Vite** - Fast build tool
- **Zustand** - State management
- **IndexedDB (Dexie)** - Client-side database
- **React Router** - Navigation
- **Lucide React** - Icon library
- **Chart.js** - Data visualization

### Backend
- **Node.js & Express** - Server framework
- **MongoDB** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Multer** - File uploads
- **Winston** - Logging

## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/kirahmadlare/kings-pos.git
cd kings-pos
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Configure environment variables:

Create `.env` file in the `server` directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/kings-pos
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

Create `.env.local` file in the root directory:
```env
VITE_API_URL=http://localhost:3001
```

4. Start MongoDB:
```bash
mongod
```

5. Start the backend server:
```bash
cd server
npm start
```

6. Start the frontend development server:
```bash
npm run dev
```

7. Open your browser and navigate to `http://localhost:5173`

## Default Credentials

After first run, you can register a new account or use the default admin credentials (if seeded):
- Email: `admin@example.com`
- Password: `admin123`

**Note:** Change default credentials immediately after first login.

## Usage

### Getting Started
1. **Setup Your Store**: Navigate to Settings to configure store name, currency, tax rate, and branding
2. **Add Inventory**: Go to Inventory to add your products with prices and stock levels
3. **Add Employees**: Create employee accounts with appropriate roles
4. **Start Selling**: Use the POS interface to process customer transactions
5. **Monitor Performance**: Check Dashboard and Reports for business insights

### For Store Owners
- Access all features including Multi-Store, Plugins, Workflows, and Permissions
- Configure system-wide settings
- View consolidated reports across all stores
- Manage employees and their roles

### For Managers
- Access inventory, sales, and customer management
- View reports and analytics
- Manage employees (if permitted)
- Process refunds and adjustments

### For Cashiers
- Process sales transactions
- View inventory
- Manage customers
- Handle payments

## Architecture

King's POS uses an offline-first architecture:
1. All data is stored locally in IndexedDB
2. Changes are synced to the server when online
3. Real-time updates via Socket.io
4. Conflict resolution for concurrent updates
5. Background sync for offline changes

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

## Roadmap

Upcoming features:
- Mobile app (iOS & Android)
- E-commerce integration
- Advanced reporting with AI insights
- Multi-language support
- Payment gateway integrations
- Warehouse management
- Customer mobile app

---

**Built with ❤️ for retail businesses**
