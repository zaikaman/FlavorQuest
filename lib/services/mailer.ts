import nodemailer from 'nodemailer';

interface NewOrderEmailPayload {
  to: string;
  ownerName?: string;
  poiName: string;
  orderId: string;
  totalAmount: number;
  itemSummary: string;
  pickupTime?: string | null;
}

function createTransporter() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  const secure = (process.env.MAIL_ENCRYPTION || '').toLowerCase() === 'ssl';

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendNewOrderEmail(payload: NewOrderEmailPayload) {
  const transporter = createTransporter();

  if (!transporter) {
    return;
  }

  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@flavorquest.com';
  const fromName = process.env.MAIL_FROM_NAME || 'FlavorQuest';

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: payload.to,
    subject: `Đơn mới #${payload.orderId.slice(0, 8)} - ${payload.poiName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Bạn có đơn đặt món mới</h2>
        <p>Xin chào ${payload.ownerName || 'chủ quán'},</p>
        <p>Khách vừa đặt món trước tại <strong>${payload.poiName}</strong>.</p>
        <ul>
          <li>Mã đơn: <strong>#${payload.orderId.slice(0, 8)}</strong></li>
          <li>Tổng tiền: <strong>${payload.totalAmount.toLocaleString('vi-VN')}đ</strong></li>
          <li>Món đã đặt: ${payload.itemSummary}</li>
          ${payload.pickupTime ? `<li>Giờ nhận món: ${new Date(payload.pickupTime).toLocaleString('vi-VN')}</li>` : ''}
        </ul>
        <p>Vui lòng vào dashboard chủ quán để xác nhận và chuẩn bị món.</p>
      </div>
    `,
  });
}
