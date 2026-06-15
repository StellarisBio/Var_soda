import nodemailer from 'nodemailer'

// 邮件配置 - 从环境变量读取，支持 .env 文件
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465')
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false' // 默认 true (465端口)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER

/**
 * 创建邮件传输器
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  purpose: 'register' | 'reset_password'
): Promise<boolean> {
  // 如果没有配置 SMTP，使用控制台输出（开发模式）
  if (!SMTP_HOST || !SMTP_USER) {
    console.log(`[DEV MODE] Verification code for ${to} (${purpose}): ${code}`)
    return true
  }

  const subjectMap = {
    register: 'WESDB - 注册验证码 / Registration Verification Code',
    reset_password: 'WESDB - 密码重置验证码 / Password Reset Verification Code',
  }

  const htmlBody = `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">WESDB</h1>
        <p style="color: #a0c4e8; margin: 8px 0 0; font-size: 14px;">WES Variant Database</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
          ${purpose === 'register' ? '您正在注册 WESDB 账号，验证码为：' : '您正在重置 WESDB 密码，验证码为：'}
        </p>
        <div style="background: #f0f9ff; border: 2px dashed #00d4ff; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 16px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
          验证码有效期为 10 分钟，请尽快使用。
        </p>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
          The verification code is valid for 10 minutes.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          如果您没有进行此操作，请忽略此邮件。 / If you did not request this, please ignore this email.
        </p>
      </div>
    </div>
  `

  try {
    const transporter = createTransporter()
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: subjectMap[purpose],
      html: htmlBody,
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}
