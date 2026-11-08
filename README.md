# HACKER RED MENU — GitHub Pages + Cloudflare Worker + Firebase RTDB

Giao diện tĩnh chạy trên GitHub Pages; Worker giữ bí mật tài khoản dịch vụ và thực hiện xác thực với Firebase Realtime Database. Không đặt Service Account JSON hoặc private key trong HTML/JS công khai.

## Tính năng GETKEY
- Tạo key ngẫu nhiên mới cho mỗi lần cấp.
- Key có hiệu lực 12 giờ.
- Tối đa 4 key/ngày cho một mã trình duyệt (ngày UTC).
- Giới hạn phụ: tối đa 20 key/ngày cho một IP.
- Key được ràng buộc với mã trình duyệt và IP tại thời điểm cấp.
- Bộ đếm dùng ETag/If-Match của Realtime Database để giảm nguy cơ vượt giới hạn khi có yêu cầu đồng thời.

Lưu ý: trình duyệt web không cung cấp hardware ID thật. Device ID ở đây là UUID lưu trong localStorage; người dùng có thể thay đổi bằng cách xóa dữ liệu trang. IP có thể thay đổi, và nhiều người có thể dùng chung một IP. Vì vậy đây là giới hạn thực tế theo browser ID + IP, không phải định danh phần cứng tuyệt đối.

## A. Chuẩn bị Firebase
1. Mở Firebase Console, chọn project đang chứa database `sharehub-feee9`.
2. Trong Project settings → Service accounts, tạo/generate private key cho service account của Firebase Admin SDK. Tải file JSON về máy.
3. Không tải file JSON này lên GitHub và không gửi nó trong chat. Nó chứa private key bí mật.
4. Trong Realtime Database → Rules, đặt rules chặn truy cập trực tiếp từ client:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

Worker truy cập bằng OAuth service account nên không cần mở database công khai. Service account cần quyền quản trị Firebase Realtime Database trong project.

## B. Deploy Cloudflare Worker
Yêu cầu Node.js và Wrangler:

```bash
npm install -g wrangler
wrangler login
```

Trong thư mục `worker`, thiết lập secret bằng đường dẫn tới JSON vừa tải (chạy lệnh ở terminal trên máy tính):

```bash
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
```

Khi terminal yêu cầu, dán toàn bộ nội dung JSON service account rồi Enter. Không đưa JSON vào file frontend.

URL database đã được cấu hình sẵn trong `wrangler.toml`:
`https://sharehub-feee9-default-rtdb.firebaseio.com`

Deploy:

```bash
npx wrangler deploy
```

Sau khi deploy, Cloudflare hiển thị URL dạng `https://hacker-red-getkey.<ten-tai-khoan>.workers.dev`.

## C. Nối GitHub Pages
1. Mở `config.js`.
2. Thay `https://YOUR-WORKER.workers.dev` bằng URL Worker thật.
3. Upload `index.html`, `style.css`, `app.js`, `config.js` lên thư mục gốc repository GitHub.
4. Vào Settings → Pages → Deploy from a branch → chọn nhánh `main` và thư mục `/ (root)`.
5. Mở trang GitHub Pages và thử GETKEY.

## D. Kiểm tra nhanh
- `POST https://<worker-url>/api/getkey` với JSON `{ "deviceId": "một-id-dài-tối-thiểu-8-ký-tự" }`.
- `POST https://<worker-url>/api/verify` với JSON `{ "deviceId": "cùng-id", "key": "key-vừa-nhận" }`.
- Không gửi IP từ frontend: Worker lấy IP từ header `CF-Connecting-IP` do Cloudflare cung cấp.

## Ghi chú
- Bộ đếm theo ngày UTC, tự chuyển ngày lúc 00:00 UTC.
- Nếu IP đổi sau khi cấp key, key sẽ không xác thực được do chính sách khóa theo IP.
- GitHub Pages chỉ phục vụ giao diện; mọi giới hạn và xác thực đều nằm ở Worker.
- Các nút trong control panel là giao diện demo, không can thiệp vào Free Fire hay trò chơi khác.
