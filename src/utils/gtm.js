export const gtmPurchase = (transactionId, value, currency, items) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId,
      currency: currency || "INR",
      value: value,
      items: items.map(item => ({
        item_id: item.item_id || item.id,
        item_name: item.item_name || item.title || item.name,
        price: item.price,
        quantity: item.quantity || 1,
        item_category: item.item_category || item.category || item.type || "Program"
      }))
    }
  });
};

export const gtmBeginCheckout = (value, currency, items) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "begin_checkout",
    ecommerce: {
      currency: currency || "INR",
      value: value,
      items: items.map(item => ({
        item_id: item.item_id || item.id,
        item_name: item.item_name || item.title || item.name,
        price: item.price,
        quantity: item.quantity || 1,
        item_category: item.item_category || item.category || item.type || "Program"
      }))
    }
  });
};

export const gtmAddToCart = (item, currency = "INR") => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "add_to_cart",
    ecommerce: {
      currency: currency,
      value: item.price,
      items: [{
        item_id: item.item_id || item.id,
        item_name: item.item_name || item.title || item.name,
        price: item.price,
        quantity: item.quantity || 1,
        item_category: item.item_category || item.category || item.type || "Program"
      }]
    }
  });
};

export const gtmViewItem = (item, currency = "INR") => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "view_item",
    ecommerce: {
      currency: currency,
      value: item.price,
      items: [{
        item_id: item.item_id || item.id,
        item_name: item.item_name || item.title || item.name,
        price: item.price,
        quantity: item.quantity || 1,
        item_category: item.item_category || item.category || item.type || "Program"
      }]
    }
  });
};
