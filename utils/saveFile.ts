import { Platform, Share } from "react-native";

/**
 * Remet un fichier texte à l'utilisateur : téléchargement dans le
 * navigateur, feuille de partage sur mobile (enregistrer, envoyer par mail…).
 */
export async function saveTextFile(filename: string, content: string, type = "application/json") {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: content });
}
