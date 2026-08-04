export interface UpiSettlementRequest {
  roomId: number;
  payerName: string;
  receiverName: string;
  amount: number;
  utr: string;
  monthLabel: string;
}
