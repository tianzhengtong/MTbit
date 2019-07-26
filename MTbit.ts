//% color="#4169e1" weight=10 icon="T"
namespace MTbit {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023


    export enum Normal_Ports{
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        U1 = 0x0f,
    }

    export enum ADRead_Ports{
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
    }


    export enum ADWrite_Ports{
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        U1 = 0x0f,
    }

    export enum RGB_Ports{
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        U1 = 0x0f,
    }

    export enum Tracker_direction {
        a = 0x01,
        b = 0x02,
    }

    export enum Servos {
        S1 = 0x0d,
        S2 = 0x0a,
        S3 = 0x0e,
        S4 = 0x0b,
        U1 = 0x0f,
        I1 = 0x0c,
    }


    export enum Motors {
        M1 = 0x02,
        M2 = 0x01,
    }





    let initialized = false
    let distanceBuf = 0;

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initMT(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        pins.setPull(DigitalPin.P0, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P2, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P3, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P8, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P12, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P13, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P14, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P15, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P16, PinPullMode.PullUp)
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;


        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }


    function stopMotor(index: number) {
        setPwm((index - 1) * 2, 0, 0);
        setPwm((index - 1) * 2 + 1, 0, 0);
    }


    /**
     * 舵机转动
     * @param index Servo Channel; eg: S1
     * @param degree [0-180] degree of servo; eg: 0, 90, 180
    */
    //% blockId=MTbit_servo block="Servo|%index|degree %degree"
    //% weight=100
    //% degree.min=0 degree.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Servo(index: Servos, degree: number): void {
        if (!initialized) {
            initMT()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index, 0, value)
    }




    /**
     * 启动电机
     */
    //% blockId=MTbit_motor_run block="Motor|%index|speed %speed"
    //% weight=85
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: Motors, speed: number): void {
        if (!initialized) {
            initMT()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }else if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pp = (index - 1) * 2
        let pn = (index - 1) * 2 + 1
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }


    /**
     * 同时启动两个电机
    */
    //% blockId=MTbit_motor_dual block="Motor|%motor1|speed %speed1|%motor2|speed %speed2"
    //% weight=84
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
        MotorRun(motor1, speed1);
        MotorRun(motor2, speed2);
    }

    /**
     * 电机运行几秒后停止
     * @param index Motor Index; eg: M1,M2
     * @param speed [-255-255] speed of motor; eg: 150, -150
     * @param delay seconde delay to stop; eg: 1
    */
    //% blockId=MTbit_motor_rundelay block="Motor|%index|speed %speed|delay %delay|s"
    //% weight=81
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
        MotorRun(index, speed);
        basic.pause(delay * 1000);
        MotorRun(index, 0);
    }


    /**
     * 停止电机
     */
    //% blockId=MTbit_stop block="Motor Stop|%index|"
    //% weight=80
    export function MotorStop(index: Motors): void {
        MotorRun(index, 0);
    }


    /**
     * 停止所有电机
     */
    //% blockId=MTbit_stop_all block="Motor Stop All"
    //% weight=79
    //% blockGap=50
    export function MotorStopAll(): void {
        if (!initialized) {
            initMT()
        }
        for (let idx = 1; idx <= 4; idx++) {
            stopMotor(idx);
        }
    }

    /**
     * 超声波测距
     */
    //% blockId=MTbit_ultrasonic block="Ultrasonic"
    //% weight=10
    export function Ultrasonic(): number {
        if (!initialized) {
            initMT()
        }
        // send pulse
        pins.digitalWritePin(DigitalPin.P14, 0)
        control.waitMicros(2);
        pins.digitalWritePin(DigitalPin.P14, 1)
        control.waitMicros(10);
        pins.digitalWritePin(DigitalPin.P14, 0)

        // read pulse
        let d = pins.P16.pulseIn(PulseValue.High, 25000);
        let ret = d;
        // filter timeout spikes
        if (ret == 0 && distanceBuf != 0) {
            ret = distanceBuf;
        }
        distanceBuf = d;
        return Math.floor(ret * 10 / 6 / 58);
    }



    /**
     * 读取模拟值传感器
     */
    //% blockId=MTbit_ad_read block="AD_sensor_Read|%index|"
    //% weight=100
    export function AD_sensor_Read(index: ADRead_Ports): number {
        if (!initialized) {
            initMT()
        }
        let val = 0
        if (index == 0x01) {
            val = pins.analogReadPin(AnalogPin.P0)
        } else if (index == 0x02) {
            val = pins.analogReadPin(AnalogPin.P1)
        } else if (index == 0x03) {
            val = pins.analogReadPin(AnalogPin.P2)
        }
        return val
    }


    /**
     * 模拟值pwm信号输出
     */
    //% blockId=MTbit_ad_write block="AD_PWM_Write|%index|,value %pwm_val"
    //% weight=100
    export function AD_PWM_Write(index: ADWrite_Ports, pwm_val: number): void {
        if (!initialized) {
            initMT()
        }
        if (index == 0x01) {
            pins.analogWritePin(AnalogPin.P0, pwm_val)
        } else if (index == 0x02) {
            pins.analogWritePin(AnalogPin.P1, pwm_val)
        } else if (index == 0x03) {
            pins.analogWritePin(AnalogPin.P2, pwm_val)
        } else if (index == 0x0f) {
            pins.analogWritePin(AnalogPin.P14, pwm_val)
        }
    }

    /**
     * 数字信号输出
     */
    //% blockId=MTbit_DO block="Digtal_Write|%index|,value %do_val"
    //% weight=100
    export function Digtal_Write(index: Normal_Ports, do_val: number): void {
        if (!initialized) {
            initMT()
        }
        if (index == 0x01) {
            pins.digitalWritePin(DigitalPin.P15, do_val)
        } else if (index == 0x02) {
            pins.digitalWritePin(DigitalPin.P12, do_val)
        } else if (index == 0x03) {
            pins.digitalWritePin(DigitalPin.P13, do_val)
        } else if (index == 0x04) {
            pins.digitalWritePin(DigitalPin.P8, do_val)
        } else if (index == 0x0f) {
            pins.digitalWritePin(DigitalPin.P16, do_val)
        }
    }

    /**
     * 数字信号读取
     */
    //% blockId=MTbit_DI block="Digtal_Read %index"
    //% weight=100
    export function Digtal_Read(index: Normal_Ports): number {
        if (!initialized) {
            initMT()
        }
        let val = 0
        if (index == 0x01) {
            val = pins.digitalReadPin(DigitalPin.P15)
        } else if (index == 0x02) {
            val = pins.digitalReadPin(DigitalPin.P12)
        } else if (index == 0x03) {
            val = pins.digitalReadPin(DigitalPin.P13)
        } else if (index == 0x04) {
            val = pins.digitalReadPin(DigitalPin.P8)
        } else if (index == 0x0f) {
            val = pins.digitalReadPin(DigitalPin.P16)
        }
        return val


    }

    /**
     * 寻迹信号读取
     */
    //% blockId=MTbit_TrackerIn block="Tracker|%index|,|%index1|Port"
    //% weight=100
    export function TrackerIn_Read(index: Normal_Ports,index1: Tracker_direction): number {
        if (!initialized) {
            initMT()
        }
        let val = 0
        if (index == 0x01) {
            if(index1 == 0x01){
                val = pins.digitalReadPin(DigitalPin.P0)
            }else{
                val = pins.digitalReadPin(DigitalPin.P15)
            }
            
        } else if (index == 0x02) {

            if(index1 == 0x01){
                val = pins.digitalReadPin(DigitalPin.P1)
            }else{
                val = pins.digitalReadPin(DigitalPin.P12)
            }

        } else if (index == 0x03) {
            if(index1 == 0x01){
                val = pins.digitalReadPin(DigitalPin.P2)
            }else{
                val = pins.digitalReadPin(DigitalPin.P13)
            }
        } else if (index == 0x04) {
            if(index1 == 0x01){
                val = pins.digitalReadPin(DigitalPin.P3)
            }else{
                val = pins.digitalReadPin(DigitalPin.P8)
            }
        } else if (index == 0x0f) {
            if(index1 == 0x01){
                val = pins.digitalReadPin(DigitalPin.P14)
            }else{
                val = pins.digitalReadPin(DigitalPin.P16)
            }
        }
        return val


    }

    /**
     * RGB传感器
     */
    //% blockId=MTbit_RGB block="RGB|%index|,Red %R_val,Green %G_val,Blue %B_val"
    //% R_val.min=0 R_val.max=1023
    //% G_val.min=0 G_val.max=1023
    //% B_val.min=0 B_val.max=1023
    //% weight=100
    export function RGB(index: RGB_Ports, R_val: number,G_val: number, B_val: number): void {
        if (!initialized) {
            initMT()
        }
        B_val = B_val*4;
        if (B_val >= 4096) {
            B_val = 4095
        }
        if (index == 0x01) {
            pins.analogWritePin(AnalogPin.P0, R_val)
            pins.analogWritePin(AnalogPin.P15, G_val)
            setPwm(0x0d, 0, B_val)
        } else if (index == 0x02) {
            pins.analogWritePin(AnalogPin.P1, R_val)
            pins.analogWritePin(AnalogPin.P12, G_val)
            setPwm(0x0a, 0, B_val)
        } else if (index == 0x03) {
            pins.analogWritePin(AnalogPin.P2, R_val)
            pins.analogWritePin(AnalogPin.P13, G_val)
            setPwm(0x0e, 0, B_val)
        }else if (index == 0x0f) {
            pins.analogWritePin(AnalogPin.P14, R_val)
            pins.analogWritePin(AnalogPin.P16, G_val)
            setPwm(0x0f, 0, B_val)
        }
    }

}
