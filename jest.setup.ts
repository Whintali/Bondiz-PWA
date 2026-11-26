// Configuration commune des tests.
import "@testing-library/jest-dom";

// Les icônes Expo chargent leurs polices via un module natif absent sous
// Jest : on les remplace par un élément qui porte le nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const icon = (family: string) => {
    const Icon = ({ name }: { name: string }) => React.createElement("span", { "data-icon": `${family}:${name}` });
    Icon.glyphMap = {};
    return Icon;
  };
  return { Feather: icon("Feather"), Ionicons: icon("Ionicons"), MaterialCommunityIcons: icon("MaterialCommunityIcons") };
});

// expo-image dépend du même module natif : une simple balise <img> suffit
// pour vérifier quelle image est affichée.
jest.mock("expo-image", () => {
  const React = require("react");
  const Image = ({ source, accessibilityLabel }: { source: any; accessibilityLabel?: string }) =>
    React.createElement("img", {
      src: typeof source === "object" && source?.uri ? source.uri : String(source),
      alt: accessibilityLabel ?? "",
    });
  return { Image };
});
