import React from "react";
import {
  FiActivity,
  FiMap,
  FiFileText,
  FiBookOpen,
  FiLogIn,
  FiMoon,
  FiSun,
  FiShield,
  FiImage,
  FiSettings,
  FiUsers,
  FiLogOut,
  FiChevronDown,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiCamera,
  FiUpload,
  FiCrosshair
} from "react-icons/fi";

export const Icons = {
  Activity: FiActivity,
  Map: FiMap,
  Report: FiFileText,
  Education: FiBookOpen,
  Login: FiLogIn,
  Moon: FiMoon,
  Sun: FiSun,
  Shield: FiShield,
  Gallery: FiImage,
  Settings: FiSettings,
  Users: FiUsers,
  Logout: FiLogOut,
  ChevronDown: FiChevronDown,
  Success: FiCheckCircle,
  Warn: FiAlertTriangle,
  Error: FiXCircle,
  Camera: FiCamera,
  Upload: FiUpload,
  Crosshair: FiCrosshair
};

export function IconWrap({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </span>
  );
}
