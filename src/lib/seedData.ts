export interface SeedProductItem {
  itemNumber: number;
  name: string;
  partCode: string;
  category: string;
  unit: string;
  hsn: string | null;
  gst: number;
}

export const SEED_PRODUCTS: SeedProductItem[] = [
  // Accessories
  { itemNumber: 1, name: "Floaty Wire", partCode: "Floaty Wire", category: "Accessories", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 2, name: "Membrane Mini Doser", partCode: "Membrane Mini Doser", category: "Accessories", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 3, name: "Teflon 15m", partCode: "Teflon 15m", category: "Accessories", unit: "Pcs", hsn: null, gst: 18 },

  // Body & Cabinet
  { itemNumber: 4, name: "Body Aqua X (Black)", partCode: "Body Aqua X (Black)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 5, name: "Body Aqua X (White)", partCode: "Body Aqua X (White)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 6, name: "Body i8 (Black)", partCode: "Body i8 (Black)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 7, name: "Body Omega (Black)", partCode: "Body Omega (Black)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 8, name: "Body Omega (White)", partCode: "Body Omega (White)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 9, name: "Body Organic Series (Black)", partCode: "Body Organic Series (Black)", category: "Body & Cabinet", unit: "Pcs", hsn: null, gst: 18 },

  // Chemicals
  { itemNumber: 10, name: "Anti Scalent", partCode: "Anti Scalent", category: "Chemicals", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 11, name: "Carbon 0.5mm", partCode: "Carbon 0.5mm", category: "Chemicals", unit: "Kg", hsn: null, gst: 18 },
  { itemNumber: 12, name: "Carbon 2mm", partCode: "Carbon 2mm", category: "Chemicals", unit: "Kg", hsn: null, gst: 18 },

  // Clamps
  { itemNumber: 13, name: "C-Clamp", partCode: "C-Clamp", category: "Clamps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 14, name: "UV-Clamp", partCode: "UV-Clamp", category: "Clamps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 15, name: "X-Clamp", partCode: "X-Clamp", category: "Clamps", unit: "Pcs", hsn: null, gst: 18 },

  // Divators
  { itemNumber: 16, name: "Divator Set (DNT) 1/4", partCode: "Divator Set (DNT) 1/4", category: "Divators", unit: "Set", hsn: null, gst: 18 },
  { itemNumber: 17, name: "Divator Set (DNT) 3/8", partCode: "Divator Set (DNT) 3/8", category: "Divators", unit: "Set", hsn: null, gst: 18 },
  { itemNumber: 18, name: "Divator Set (SS) 1/4", partCode: "Divator Set (SS) 1/4", category: "Divators", unit: "Set", hsn: null, gst: 18 },
  { itemNumber: 19, name: "Divator Tap 1/4", partCode: "Divator Tap 1/4", category: "Divators", unit: "Pcs", hsn: null, gst: 18 },

  // Electronics
  { itemNumber: 20, name: "AM1117 3.3V", partCode: "AM1117 3.3V", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 21, name: "Battery 2506", partCode: "Battery 2506", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 22, name: "Buck 2596", partCode: "Buck 2596", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 23, name: "Diode 4007", partCode: "Diode 4007", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 24, name: "ESP 12E", partCode: "ESP 12E", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 25, name: "ESP 8266", partCode: "ESP 8266", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 26, name: "Header Pin Female 2.54mm", partCode: "Header Pin Female 2.54mm", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 27, name: "Header Pin Male 2.54mm", partCode: "Header Pin Male 2.54mm", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 28, name: "Header Pin Male 2mm", partCode: "Header Pin Male 2mm", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 29, name: "Resistance 1 Ohm", partCode: "Resistance 1 Ohm", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 30, name: "Resistance 10K", partCode: "Resistance 10K", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 31, name: "Resistance 1K", partCode: "Resistance 1K", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 32, name: "RTC 1302", partCode: "RTC 1302", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 33, name: "Zener Diode 24V", partCode: "Zener Diode 24V", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 34, name: "Zener Diode 3.3V", partCode: "Zener Diode 3.3V", category: "Electronics", unit: "Pcs", hsn: null, gst: 18 },

  // Filters
  { itemNumber: 35, name: "Charcoal - coconut", partCode: "Charcoal - coconut", category: "Filters", unit: "Kg", hsn: null, gst: 18 },
  { itemNumber: 36, name: "Drop Body g1 white", partCode: "Drop Body g1 white", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 37, name: "Drop Body g1(black)", partCode: "Drop Body g1(black)", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 38, name: "Drop Normal body -black", partCode: "Drop Normal body -black", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 39, name: "Drop Pro (black)", partCode: "Drop Pro (black)", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 40, name: "drop pro white", partCode: "drop pro white", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 41, name: "female connector 3/8", partCode: "female connector 3/8", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 42, name: "FR 550", partCode: "FR 550", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 43, name: "FRT 300", partCode: "FRT 300", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 44, name: "FRT 450", partCode: "FRT 450", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 45, name: "Housing Bowl 10\" Transparent", partCode: "Housing Bowl 10\" Transparent", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 46, name: "Inline Carbon", partCode: "Inline Carbon", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 47, name: "Inline Sediment", partCode: "Inline Sediment", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 48, name: "Plain Cover", partCode: "Plain Cover", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 49, name: "Post Carbon", partCode: "Post Carbon", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 50, name: "Sediment Filter Cartridge 10\"", partCode: "Sediment Filter Cartridge 10\"", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 51, name: "Spun (160gm)", partCode: "Spun (160gm)", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 52, name: "testy carbon 4 inch", partCode: "testy carbon 4 inch", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 53, name: "UF (15)", partCode: "UF (15)", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 54, name: "UF (Drop)", partCode: "UF (Drop)", category: "Filters", unit: "Pcs", hsn: null, gst: 18 },

  // Fittings
  { itemNumber: 55, name: "Bulk Head", partCode: "Bulk Head", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 56, name: "Elbow 1/4 TxP", partCode: "Elbow 1/4 TxP", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 57, name: "Elbow 1/8 TxP", partCode: "Elbow 1/8 TxP", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 58, name: "Elbow 3/8 TxP", partCode: "Elbow 3/8 TxP", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 59, name: "Lattu 1/4", partCode: "Lattu 1/4", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 60, name: "Lattu 3/8", partCode: "Lattu 3/8", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 61, name: "Pump Elbow", partCode: "Pump Elbow", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 62, name: "Stainer Pot Type Mini", partCode: "Stainer Pot Type Mini", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 63, name: "Stem Elbow 1/4", partCode: "Stem Elbow 1/4", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 64, name: "Tee 1/4 PxPxP", partCode: "Tee 1/4 PxPxP", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 65, name: "Tee 1/4 PxTxP", partCode: "Tee 1/4 PxTxP", category: "Fittings", unit: "Pcs", hsn: null, gst: 18 },

  // G1 Purifier Components
  { itemNumber: 66, name: "Adapter (Power)", partCode: "G1-PART-35", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 67, name: "Bolte", partCode: "G1-PART-19", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 68, name: "C Clamp", partCode: "G1-PART-01", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 69, name: "Candal", partCode: "G1-PART-03", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 70, name: "Cap", partCode: "G1-PART-29", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 71, name: "Carbon Filter", partCode: "G1-PART-31", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 72, name: "Clip", partCode: "G1-PART-24", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 73, name: "Divetor Valve", partCode: "G1-PART-34", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 74, name: "Female Adapter", partCode: "G1-PART-36", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 75, name: "Floty (Float Switch)", partCode: "G1-PART-15", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 76, name: "FR (Flow Restrictor)", partCode: "G1-PART-10", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 77, name: "Goli", partCode: "G1-PART-05", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 78, name: "High Pressure Switch", partCode: "G1-PART-11", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 79, name: "Kuppi", partCode: "G1-PART-25", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 80, name: "Low Pressure Switch", partCode: "G1-PART-12", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 81, name: "Motor (Pump)", partCode: "G1-PART-13", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 82, name: "Nut", partCode: "G1-PART-18", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 83, name: "Pipe (3 Meters)", partCode: "G1-PART-37", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 84, name: "Pipe Connector", partCode: "G1-PART-26", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 85, name: "PP Filter", partCode: "G1-PART-23", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 86, name: "PVC Pipe", partCode: "G1-PART-30", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 87, name: "RO Membrane (GPD Element)", partCode: "G1-PART-07-MEMB", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 88, name: "Screw", partCode: "G1-PART-17", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 89, name: "SV (Solenoid Valve)", partCode: "G1-PART-09", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 90, name: "Tee P/P/P", partCode: "G1-PART-20", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 91, name: "Thread Elbow (B Size)", partCode: "G1-PART-22", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 92, name: "Thread Elbow (M Size)", partCode: "G1-PART-21", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 93, name: "Thread Elbow (S Size)", partCode: "G1-PART-38", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 94, name: "Thread Tee P/P/T", partCode: "G1-PART-33", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 95, name: "Tie (B Size)", partCode: "G1-PART-27", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 96, name: "Tie (S Size)", partCode: "G1-PART-28", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 97, name: "UV Light", partCode: "G1-PART-14", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 98, name: "X Clamp", partCode: "G1-PART-02", category: "G1 Purifier Components", unit: "Pcs", hsn: null, gst: 18 },

  // Hardware
  { itemNumber: 99, name: "Adaptor", partCode: "Adaptor", category: "Hardware", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 100, name: "Adaptor Pin", partCode: "Adaptor Pin", category: "Hardware", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 101, name: "Adaptor SMPS", partCode: "Adaptor SMPS", category: "Hardware", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 102, name: "Lug Gold", partCode: "Lug Gold", category: "Hardware", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 103, name: "Lug Silver", partCode: "Lug Silver", category: "Hardware", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 104, name: "Wire", partCode: "Wire", category: "Hardware", unit: "Meter", hsn: null, gst: 18 },

  // Membranes & Housings
  { itemNumber: 105, name: "Housing Bowl 10\" Black", partCode: "Housing Bowl 10\" Black", category: "Membranes & Housings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 106, name: "Housing Bowl 10\" White", partCode: "Housing Bowl 10\" White", category: "Membranes & Housings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 107, name: "Membrane (CSM 80) 10\"", partCode: "Membrane (CSM 80) 10\"", category: "Membranes & Housings", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 108, name: "Membrane Housing 10\"", partCode: "Membrane Housing 10\"", category: "Membranes & Housings", unit: "Pcs", hsn: null, gst: 18 },

  // Misc
  { itemNumber: 109, name: "Blue Shrinkable Tube", partCode: "Blue Shrinkable Tube", category: "Misc", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 110, name: "Box (202)", partCode: "Box (202)", category: "Misc", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 111, name: "Tie Belt 100mm", partCode: "Tie Belt 100mm", category: "Misc", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 112, name: "Tie Belt 350mm", partCode: "Tie Belt 350mm", category: "Misc", unit: "Pcs", hsn: null, gst: 18 },

  // Pipes
  { itemNumber: 113, name: "Pipe 1/4 Black", partCode: "Pipe 1/4 Black", category: "Pipes", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 114, name: "Pipe 1/4 White", partCode: "Pipe 1/4 White", category: "Pipes", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 115, name: "Pipe 3/8 Black", partCode: "Pipe 3/8 Black", category: "Pipes", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 116, name: "Pipe 3/8 White", partCode: "Pipe 3/8 White", category: "Pipes", unit: "Meter", hsn: null, gst: 18 },
  { itemNumber: 117, name: "Pipe Wiring 3/4", partCode: "Pipe Wiring 3/4", category: "Pipes", unit: "Meter", hsn: null, gst: 18 },

  // Pumps
  { itemNumber: 118, name: "Pump (Gen Pure)", partCode: "Pump (Gen Pure)", category: "Pumps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 119, name: "Pump (Pune)", partCode: "Pump (Pune)", category: "Pumps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 120, name: "Pump (Purtic New)", partCode: "Pump (Purtic New)", category: "Pumps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 121, name: "Pump (Purtic Old)", partCode: "Pump (Purtic Old)", category: "Pumps", unit: "Pcs", hsn: null, gst: 18 },

  // Spare Parts
  { itemNumber: 122, name: "2/1 PxP", partCode: "2/1 PxP", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 123, name: "Diverter", partCode: "Diverter", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 124, name: "Motor Elbow", partCode: "Motor Elbow", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 125, name: "Push", partCode: "Push", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 126, name: "Push Elbow", partCode: "Push Elbow", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 127, name: "PxP 1/4", partCode: "PxP 1/4", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 128, name: "stem elbow 3/8", partCode: "stem elbow 3/8", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 129, name: "stopper 1/4", partCode: "stopper 1/4", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 130, name: "T PXP", partCode: "T PXP", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 131, name: "Taplon", partCode: "Taplon", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 132, name: "TxP elbow (membrane-housing)Small", partCode: "TxP elbow (membrane-housing)Small", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 133, name: "X-Clamp(small-big)", partCode: "X-Clamp(small-big)", category: "Spare Parts", unit: "Pcs", hsn: null, gst: 18 },

  // Switches
  { itemNumber: 134, name: "Floaty Switch 2 Pin", partCode: "Floaty Switch 2 Pin", category: "Switches", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 135, name: "Floaty Switch 3 Pin", partCode: "Floaty Switch 3 Pin", category: "Switches", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 136, name: "Switch NC", partCode: "Switch NC", category: "Switches", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 137, name: "Switch NO", partCode: "Switch NO", category: "Switches", unit: "Pcs", hsn: null, gst: 18 },

  // Taps
  { itemNumber: 138, name: "Tap Gold (Grand)", partCode: "Tap Gold (Grand)", category: "Taps", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 139, name: "Tap Silver (Grand)", partCode: "Tap Silver (Grand)", category: "Taps", unit: "Pcs", hsn: null, gst: 18 },

  // UV Components
  { itemNumber: 140, name: "UV SLX", partCode: "UV SLX", category: "UV Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 141, name: "UV Tank (1 LED)", partCode: "UV Tank (1 LED)", category: "UV Components", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 142, name: "UV Tank (3 LED)", partCode: "UV Tank (3 LED)", category: "UV Components", unit: "Pcs", hsn: null, gst: 18 },

  // Valves
  { itemNumber: 143, name: "Auto Flash SV", partCode: "Auto Flash SV", category: "Valves", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 144, name: "HPS", partCode: "HPS", category: "Valves", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 145, name: "LPS", partCode: "LPS", category: "Valves", unit: "Pcs", hsn: null, gst: 18 },
  { itemNumber: 146, name: "SV (SLX)", partCode: "SV (SLX)", category: "Valves", unit: "Pcs", hsn: null, gst: 18 }
];
