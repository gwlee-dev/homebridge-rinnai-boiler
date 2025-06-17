type Boiler = {
  roomControlId: string;
  gpsInfo: string;
  productType: string;
  boilerAlias: string;
  roomControlGpsOutDistancee: string;
  roomControlGpsReturnDistancee: string;
  outOnOff: string;
  returnOnOff: string;
};

type User = {
  question: string;
  answer: string;
  userId: string;
  userAlias: string;
  deviceId: string;
  email: string;
  emailCheck: boolean;
  agreementCheck: boolean;
};

type RinnaiConfig = {
  email: string;
  password: string;
  platform: string;
  deviceId: string;
  deviceToken: string;
};
