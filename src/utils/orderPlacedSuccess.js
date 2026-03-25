const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

module.exports = ({ user, order }) => `
  <h2>Order placed successfully</h2>

  <p>Dear ${user.firstName} ${user.lastName},</p>

  <p>
    Your order <strong>${order.orderId}</strong> has been placed successfully with
    <strong> Medha Botanics</strong>.
  </p>

  <p>
    Current status: <strong>${order.orderStatus}</strong><br />
    Total amount: <strong>${formatCurrency(order.totalAmount)}</strong>
  </p>

  <p>
    We will keep you updated as your order moves through packing, shipping, and delivery.
  </p>

  <p>
    Thank you for choosing us.<br />
    <strong>Team Medha Botanics</strong>
  </p>
`;
