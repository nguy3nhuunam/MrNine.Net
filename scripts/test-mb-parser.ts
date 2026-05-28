import { parseMbEmail } from "../lib/billing/mbbank-parser";

const samples = [
  {
    name: "GD nhận tiền with +amount",
    body: `
MB Bank xin thông báo biến động số dư
Tài khoản: 0123456789
Loại GD: GD nhận tiền
Số tiền: +100,000 VND
Số dư: 1,234,567 VND
Nội dung: NGUYEN VAN A chuyen tien MR-AB12CD34 cam on
Mã GD: FT2412345678
`,
    expect: { ref: "MR-AB12CD34", amountVnd: 100000, direction: "in" },
  },
  {
    name: "Outbound -amount",
    body: `
Loại GD: GD chuyển tiền
Số tiền: -50,000 VND
Số dư: 1,000,000 VND
Nội dung: thanh toan dien MR-EE112233
`,
    expect: { ref: "MR-EE112233", amountVnd: 50000, direction: "out" },
  },
  {
    name: "Number formatting variations",
    body: `Số tiền: 250.000 VND
Nội dung: ck noi bo MR-DEADBEEF`,
    expect: { ref: "MR-DEADBEEF", amountVnd: 250000, direction: "in" },
  },
];

let pass = 0;
let fail = 0;

for (const s of samples) {
  const got = parseMbEmail(s.body);
  const ok =
    got &&
    got.ref === s.expect.ref &&
    got.amountVnd === s.expect.amountVnd &&
    got.direction === s.expect.direction;
  if (ok) {
    console.log(`✓ ${s.name}`);
    pass++;
  } else {
    console.log(`✗ ${s.name}`, got);
    fail++;
  }
}
console.log(`\n${pass}/${pass + fail} pass`);
process.exit(fail === 0 ? 0 : 1);
