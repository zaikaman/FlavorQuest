import nodemailer from 'nodemailer';

interface NewOrderEmailPayload {
  to: string;
  ownerName?: string;
  poiName: string;
  orderId: string;
  totalAmount: number;
  itemSummary: string;
  orderType: 'pickup' | 'delivery';
  scheduledTime?: string | null;
  deliveryAddress?: string | null;
}

interface SupportChatEmailPayload {
  to: string;
  recipientRole: 'customer' | 'owner' | 'admin';
  senderEmail?: string | null;
  threadLabel: string;
  messagePreview: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
        <p>Khách vừa tạo ${payload.orderType === 'delivery' ? 'đơn giao hàng' : 'đơn nhận tại quán'} tại <strong>${payload.poiName}</strong>.</p>
        <ul>
          <li>Mã đơn: <strong>#${payload.orderId.slice(0, 8)}</strong></li>
          <li>Tổng tiền: <strong>${payload.totalAmount.toLocaleString('vi-VN')}đ</strong></li>
          <li>Món đã đặt: ${payload.itemSummary}</li>
          <li>Loại đơn: ${payload.orderType === 'delivery' ? 'Giao tận nơi' : 'Nhận tại quán'}</li>
          ${payload.scheduledTime ? `<li>Thời gian hẹn: ${new Date(payload.scheduledTime).toLocaleString('vi-VN')}</li>` : ''}
          ${payload.deliveryAddress ? `<li>Địa chỉ giao: ${payload.deliveryAddress}</li>` : ''}
        </ul>
        <p>Vui lòng vào dashboard chủ quán để xác nhận và chuẩn bị món.</p>
      </div>
    `,
  });
}

export async function sendSupportChatEmail(payload: SupportChatEmailPayload) {
  const transporter = createTransporter();

  if (!transporter) {
    return;
  }

  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@flavorquest.com';
  const fromName = process.env.MAIL_FROM_NAME || 'FlavorQuest';
  const greeting =
    payload.recipientRole === 'owner'
      ? 'Chủ quán'
      : payload.recipientRole === 'admin'
        ? 'Đội ngũ admin'
        : 'Bạn';
  const escapedThreadLabel = escapeHtml(payload.threadLabel);
  const escapedMessagePreview = escapeHtml(payload.messagePreview);
  const escapedSenderEmail = payload.senderEmail ? escapeHtml(payload.senderEmail) : null;

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: payload.to,
    subject: `Tin nhắn mới trong ${payload.threadLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Bạn có tin nhắn chat mới</h2>
        <p>Xin chào ${greeting},</p>
        <p>
          ${
            escapedSenderEmail
              ? `<strong>${escapedSenderEmail}</strong> vừa gửi tin nhắn mới trong <strong>${escapedThreadLabel}</strong>.`
              : `Bạn vừa nhận được tin nhắn mới trong <strong>${escapedThreadLabel}</strong>.`
          }
        </p>
        <div style="margin: 16px 0; padding: 14px 16px; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa;">
          ${escapedMessagePreview}
        </div>
        <p>Vui lòng mở trang chat trong FlavorQuest để phản hồi.</p>
      </div>
    `,
  });
}
