export default class TimestampedData<T> {
    public timestamp: number;
    public data: T;

    constructor(data: T, timestamp: number) {
        this.data = data;
        this.timestamp = timestamp;
    }

    public toMap(transform: ((data: T) => object) | undefined | null = undefined) {
        return {
            'timestamp': this.timestamp,
            'data': transform ? transform(this.data) : this.data
        }
    }

    public static fromMap<T>(map: Map<string, object>, transform: ((data: object) => T) | undefined | null = undefined) {
        return new TimestampedData<T>(
            transform ? transform(map['data']) : map['data'],
            map['timestamp'],
        );
    }
}