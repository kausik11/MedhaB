module.exports = ({ user, order, note }) => `
  <h2>Your order status has been updated</h2>

  <p>Dear ${user.firstName} ${user.lastName},</p>

  <p>
    Your order <strong>${order.orderId}</strong> is now
    <strong> ${order.orderStatus.replace(/_/g, " ")}</strong>.
  </p>

  ${
    note
      ? `<p>Note from our team: <strong>${note}</strong></p>`
      : ""
  }

  <p>
    Thank you for shopping with <strong>Medha Botanics</strong>.<br />
    <strong>Team Medha Botanics</strong>
  </p>
`;
