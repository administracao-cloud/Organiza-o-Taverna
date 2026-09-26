const rawEvent = {
  order: {
    id: "sim-123",
    displayId: "1234",
    createdAt: new Date().toISOString(),
    orderTiming: "INSTANT",
    orderType: "DELIVERY",
    customer: { id: "cust-sim-123", name: "Cliente Teste", phone: "123" },
    delivery: { deliveredBy: "IFOOD", deliveryAddress: { formattedAddress: "Av Teste" } },
    items: [
      { id: "item-1", name: "Bolo Vulcão Ninho com Nutella", quantity: 1, unitPrice: 62.90, totalPrice: 62.90 }
    ],
    total: { subTotal: 62.90, deliveryFee: 0, benefits: 0, orderAmount: 62.90 }
  }
};

const raw = rawEvent.order;
const rawItems = Array.isArray(raw.items) ? raw.items : [];
const items = rawItems.map((it, idx) => {
  const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
  const unitPrice = Number(it.unitPrice ?? it.price ?? 0) || 0;
  const totalPrice = Number(it.totalPrice ?? (unitPrice * qty)) || (unitPrice * qty);
  
  return {
    productId: String(it.externalCode || it.id || `prod-ifd-${idx}`),
    productName: String(it.name || it.productName || "Item do Cardápio"),
    sku: String(it.externalCode || `IFD-${idx + 1}`),
    quantity: qty,
    unitPrice,
    totalPrice,
  };
});

console.log(JSON.stringify(items, null, 2));
