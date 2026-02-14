export interface Settlement {
    roomId: number;
    payerName: string;
    receiverName: string;
    settlementAmount: number;
    monthLabel: string;
    settlementMonth?: Date | null;
}