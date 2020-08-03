export default class Sleep {
    public static sleep(n:number) {
        this.msleep(n * 1000);
    }

    public static msleep(n:number) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,n);
    }
}