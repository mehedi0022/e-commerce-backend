export const moneyMultiply = (value: unknown, quantity: number) => {
  const [whole, fraction = ""] = String(value).split(".");
  const cents = BigInt(`${whole}${fraction.padEnd(2, "0").slice(0, 2)}`);
  const total = cents * BigInt(quantity);
  return formatCents(total);
};

export const moneySum = (values: string[]) =>
  formatCents(values.reduce((sum, value) => sum + parseCents(value), 0n));

const parseCents = (value: string) => {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(2, "0").slice(0, 2)}`);
};

const formatCents = (cents: bigint) => {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};
