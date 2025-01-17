import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from "homebridge";

import type { RinnaiBoilerPlatform } from "./platform.js";

export class RinnaiBoilerAccessory {
  private service: Service;

  constructor(
    private readonly platform: RinnaiBoilerPlatform,
    private readonly accessory: PlatformAccessory<Boiler>
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Rinnai")
      .setCharacteristic(
        this.platform.Characteristic.Model,
        this.accessory.context.productType
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.accessory.context.roomControlId
      );

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .setProps({
        validValues: [
          this.platform.Characteristic.TargetHeatingCoolingState.OFF,
          this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
          this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
        ],
      })
      .onGet(this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [
          this.platform.Characteristic.TargetHeatingCoolingState.OFF,
          this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
          this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
        ],
      })
      .onGet(this.handleTargetHeaterCoolerStateGet.bind(this))
      .onSet(this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));
  }

  handleActiveGet() {
    this.platform.log.debug("Triggered GET Active");

    const currentValue = this.platform.Characteristic.Active.INACTIVE;

    return currentValue;
  }

  handleActiveSet(value: CharacteristicValue) {
    this.platform.log.debug("Triggered SET Active:" + value);
  }

  handleCurrentHeaterCoolerStateGet() {
    this.platform.log.debug("Triggered GET CurrentHeaterCoolerState");

    const currentValue =
      this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;

    return currentValue;
  }

  async handleTargetHeaterCoolerStateGet() {
    this.platform.log.debug("Triggered GET TargetHeaterCoolerState");
    await this.getCurrentTarget();
    const currentValue =
      this.platform.Characteristic.TargetHeaterCoolerState.AUTO;

    return currentValue;
  }

  handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    this.platform.log.debug("Triggered SET TargetHeaterCoolerState:" + value);

    //sm0103010201007d 전원
  }

  async getCurrentTarget() {
    const response = await fetch(new URL("/query", this.platform.baseURL), {
      method: "POST",
      headers: {
        Accept: "text/plain",
        DeviceId: this.platform.config.deviceId,
        RoomControlId: this.accessory.context.roomControlId,
      },
      body: "sm00020100007d",
    });
    const text: string = await response.text();
    console.log(text);
    const roomTempHex = text.substring(12, 14);
    const hotWaterTempHex = text.substring(14, 16);
    const waterCorrectionHex = text.substring(16, 18);

    const roomTemperature = parseInt(roomTempHex, 16);
    const hotWaterTemperature = parseInt(hotWaterTempHex, 16);
    const waterCorrectionRaw = parseInt(waterCorrectionHex, 16);

    const waterCorrection =
      waterCorrectionRaw >= 128
        ? waterCorrectionRaw - 128 + 0.5
        : waterCorrectionRaw;

    const result = {
      방온도: `${roomTemperature}°C`,
      온수온도: `${hotWaterTemperature}°C`,
      온수온도보정: `${waterCorrection.toFixed(1)}°C`,
    };

    console.log("해석된 결과:", result);
    return result;
  }

  async handleCurrentTemperatureGet() {
    this.platform.log.debug("Triggered GET CurrentTemperature");

    const currentValue = -270;

    return currentValue;
  }
}
