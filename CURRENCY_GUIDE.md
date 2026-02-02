# Currency System Guide

## Overview

The POS system now supports dynamic currency based on store settings. Currency symbols and formatting automatically adapt to the selected currency in the store settings.

## Supported Currencies

The system supports 35+ currencies including:

| Currency | Code | Symbol | Example |
|----------|------|--------|---------|
| US Dollar | USD | $ | $1,234.56 |
| Euro | EUR | € | €1.234,56 |
| British Pound | GBP | £ | £1,234.56 |
| Japanese Yen | JPY | ¥ | ¥1,235 |
| Chinese Yuan | CNY | ¥ | ¥1,234.56 |
| Indian Rupee | INR | ₹ | ₹1,234.56 |
| Australian Dollar | AUD | A$ | A$1,234.56 |
| Canadian Dollar | CAD | C$ | C$1,234.56 |
| Swiss Franc | CHF | Fr | Fr1'234.56 |
| Swedish Krona | SEK | kr | 1 234,56 kr |
| Brazilian Real | BRL | R$ | R$1.234,56 |
| South African Rand | ZAR | R | R1,234.56 |
| Turkish Lira | TRY | ₺ | ₺1.234,56 |
| Russian Ruble | RUB | ₽ | ₽1 234,56 |
| And 20+ more... | | | |

## Usage

### Method 1: Using the useCurrency Hook (Recommended)

```javascript
import { useCurrency } from '../hooks/useCurrency';

function MyComponent() {
    const { formatCurrency, symbol, currency } = useCurrency();

    return (
        <div>
            <p>Price: {formatCurrency(99.99)}</p>
            <p>Symbol: {symbol}</p>
            <p>Currency Code: {currency}</p>
        </div>
    );
}
```

### Method 2: Using the Utility Function

```javascript
import { formatCurrency } from '../utils/format';
import { useAuthStore } from '../stores/authStore';

function MyComponent() {
    const { store } = useAuthStore();

    return (
        <div>
            <p>Price: {formatCurrency(99.99, store?.currency)}</p>
        </div>
    );
}
```

## API Reference

### useCurrency Hook

```javascript
const {
    currency,           // Current currency code (e.g., 'USD')
    symbol,            // Currency symbol (e.g., '$')
    locale,            // Locale for formatting (e.g., 'en-US')
    formatCurrency,    // Function to format amounts
    getCurrencySymbol  // Function to get just the symbol
} = useCurrency();
```

### formatCurrency Function

```javascript
/**
 * Format amount as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
formatCurrency(1234.56)
// Returns: "$1,234.56" (if USD)
// Returns: "€1.234,56" (if EUR)
// Returns: "£1,234.56" (if GBP)
```

## Examples

### POS Component (Updated)

```javascript
import { useCurrency } from '../hooks/useCurrency';

function POS() {
    const { formatCurrency } = useCurrency();

    return (
        <div className="cart-item">
            <span className="cart-item-price">
                {formatCurrency(product.price)}
            </span>
        </div>
    );
}
```

### Dashboard Component

```javascript
import { useCurrency } from '../hooks/useCurrency';

function Dashboard() {
    const { formatCurrency, symbol } = useCurrency();

    return (
        <div className="kpi-card">
            <h3>Total Revenue</h3>
            <p className="kpi-value">{formatCurrency(totalRevenue)}</p>
            <p className="kpi-subtitle">Currency: {symbol}</p>
        </div>
    );
}
```

### Reports Component

```javascript
import { useCurrency } from '../hooks/useCurrency';

function Reports() {
    const { formatCurrency, currency } = useCurrency();

    return (
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Revenue ({currency})</th>
                </tr>
            </thead>
            <tbody>
                {products.map(product => (
                    <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{formatCurrency(product.revenue)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

## Setting the Currency

### In Settings Page

Users can change the currency in Settings → Store Settings:

```javascript
// Settings.jsx
<select
    name="currency"
    value={storeSettings.currency}
    onChange={handleChange}
>
    <option value="USD">US Dollar ($)</option>
    <option value="EUR">Euro (€)</option>
    <option value="GBP">British Pound (£)</option>
    <option value="JPY">Japanese Yen (¥)</option>
    <option value="INR">Indian Rupee (₹)</option>
    {/* ... more options */}
</select>
```

### Backend Storage

Currency is stored in the Store model:

```javascript
// Store.js (MongoDB)
currency: {
    type: String,
    default: 'USD'
}
```

## Migration Guide

To update existing components to use the new currency system:

### Before:
```javascript
function MyComponent() {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    return <span>{formatCurrency(99.99)}</span>;
}
```

### After:
```javascript
import { useCurrency } from '../hooks/useCurrency';

function MyComponent() {
    const { formatCurrency } = useCurrency();

    return <span>{formatCurrency(99.99)}</span>;
}
```

## Components Already Updated

✅ **POS.jsx** - Updated to use useCurrency hook

## Components to Update

The following components should be updated to use the useCurrency hook:

- [ ] Dashboard.jsx
- [ ] Analytics.jsx
- [ ] Reports.jsx
- [ ] Inventory.jsx
- [ ] Orders.jsx
- [ ] Customers.jsx
- [ ] Employees.jsx
- [ ] CentralDashboard.jsx
- [ ] StoreComparison.jsx
- [ ] And 40+ more...

## Automatic Migration Script

You can use this regex pattern to find hardcoded currency formatting:

```regex
const formatCurrency = \(amount\) => \{[\s\S]*?\};
```

Replace with:
```javascript
const { formatCurrency } = useCurrency();
```

## Benefits

1. **Consistency**: All currency formatting follows the same pattern
2. **Localization**: Proper formatting for each currency's locale
3. **Flexibility**: Easy to add new currencies
4. **Maintainability**: Central location for currency logic
5. **User Experience**: Automatic adaptation based on store settings

## Notes

- Currency changes take effect immediately after saving in settings
- All amounts are stored as numbers in the database
- Formatting only happens in the UI layer
- Supports both symbol-first (e.g., $100) and symbol-after (e.g., 100kr) formats
- Handles decimal and thousands separators correctly for each locale

## Support

For adding new currencies or custom formatting, edit:
- `src/hooks/useCurrency.js` - Add currency to CURRENCY_SYMBOLS and CURRENCY_LOCALES
- `src/utils/format.js` - Update the formatCurrency function if needed
