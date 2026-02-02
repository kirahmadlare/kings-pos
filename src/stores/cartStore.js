import { create } from 'zustand';

// Cart store for POS
export const useCartStore = create((set, get) => ({
    items: [],
    discount: 0,
    discountType: 'percent', // 'percent' or 'fixed'
    customerId: null,
    notes: '',

    // Add item to cart
    addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            // Update quantity
            const newItems = [...items];
            newItems[existingIndex].quantity += quantity;
            set({ items: newItems });
        } else {
            // Add new item
            const itemPrice = product.discountPercent &&
                new Date() >= new Date(product.discountStart) &&
                new Date() <= new Date(product.discountEnd)
                ? product.price * (1 - product.discountPercent / 100)
                : product.price;

            set({
                items: [...items, {
                    productId: product.id,
                    serverId: product.serverId, // MongoDB ObjectId for syncing
                    name: product.name,
                    price: itemPrice,
                    originalPrice: product.price,
                    quantity,
                    imageUrl: product.imageUrl
                }]
            });
        }
    },

    // Update item quantity
    updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(productId);
            return;
        }

        const { items } = get();
        const newItems = items.map(item =>
            item.productId === productId ? { ...item, quantity } : item
        );
        set({ items: newItems });
    },

    // Remove item from cart
    removeItem: (productId) => {
        const { items } = get();
        set({ items: items.filter(item => item.productId !== productId) });
    },

    // Set discount
    setDiscount: (discount, type = 'percent') => {
        set({ discount, discountType: type });
    },

    // Set customer
    setCustomer: (customerId) => {
        set({ customerId });
    },

    // Set notes
    setNotes: (notes) => {
        set({ notes });
    },

    // Calculate subtotal
    getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    // Calculate discount amount
    getDiscountAmount: () => {
        const { discount, discountType } = get();
        const subtotal = get().getSubtotal();

        if (discountType === 'percent') {
            return subtotal * (discount / 100);
        }
        return Math.min(discount, subtotal);
    },

    // Calculate tax
    getTax: (taxRate = 0) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        return (subtotal - discountAmount) * (taxRate / 100);
    },

    // Calculate total
    getTotal: (taxRate = 0) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const tax = get().getTax(taxRate);
        return subtotal - discountAmount + tax;
    },

    // Get item count
    getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
    },

    // Clear cart
    clearCart: () => {
        set({
            items: [],
            discount: 0,
            discountType: 'percent',
            customerId: null,
            notes: ''
        });
    }
}));

export default useCartStore;
