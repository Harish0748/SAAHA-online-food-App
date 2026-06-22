import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState(null);
  const [items, setItems] = useState([]); // [{ id, name, price, quantity }]

  const addItem = useCallback((item, fromRestaurantId, fromRestaurantName) => {
    setItems((prev) => {
      // Switching restaurants clears the cart (single-restaurant cart, like most delivery apps)
      if (restaurantId && restaurantId !== fromRestaurantId) {
        return [{ ...item, quantity: 1 }];
      }
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setRestaurantId(fromRestaurantId);
    setRestaurantName(fromRestaurantName);
  }, [restaurantId]);

  const decreaseItem = useCallback((itemId) => {
    setItems((prev) => {
      const next = prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      if (next.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      if (next.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
  }, []);

  const itemTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        restaurantId, restaurantName, items,
        addItem, decreaseItem, removeItem, clearCart,
        itemTotal, itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
