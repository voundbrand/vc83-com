/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 3: USERS & INVITES
 *
 * Seeds translations for:
 * - User management table
 * - Invite user modal
 * - Edit user modal
 * - Status badges
 * - Role names
 *
 * Run: npx convex run translations/seedManage_03_Users:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 3: Users & Invites)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // === USER MANAGEMENT TABLE ===
      {
        key: "ui.manage.users.team_members",
        values: {
          en: "Team Members",
          de: "Teammitglieder",
          pl: "Członkowie zespołu",
          es: "Miembros del equipo",
          fr: "Membres de l'équipe",
          ja: "チームメンバー",
        }
      },
      {
        key: "ui.manage.users.invite_user",
        values: {
          en: "Invite User",
          de: "Benutzer einladen",
          pl: "Zaproś użytkownika",
          es: "Invitar usuario",
          fr: "Inviter un utilisateur",
          ja: "ユーザーを招待",
        }
      },
      {
        key: "ui.manage.users.name",
        values: {
          en: "Name",
          de: "Name",
          pl: "Imię",
          es: "Nombre",
          fr: "Nom",
          ja: "名前",
        }
      },
      {
        key: "ui.manage.users.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "E-mail",
          ja: "メール",
        }
      },
      {
        key: "ui.manage.users.role",
        values: {
          en: "Role",
          de: "Rolle",
          pl: "Rola",
          es: "Rol",
          fr: "Rôle",
          ja: "役割",
        }
      },
      {
        key: "ui.manage.users.joined",
        values: {
          en: "Joined",
          de: "Beigetreten",
          pl: "Dołączył",
          es: "Se unió",
          fr: "Rejoint",
          ja: "参加日",
        }
      },
      {
        key: "ui.manage.users.status",
        values: {
          en: "Status",
          de: "Status",
          pl: "Status",
          es: "Estado",
          fr: "Statut",
          ja: "ステータス",
        }
      },
      {
        key: "ui.manage.users.actions",
        values: {
          en: "Actions",
          de: "Aktionen",
          pl: "Akcje",
          es: "Acciones",
          fr: "Actions",
          ja: "アクション",
        }
      },
      {
        key: "ui.manage.users.edit_user",
        values: {
          en: "Edit user",
          de: "Benutzer bearbeiten",
          pl: "Edytuj użytkownika",
          es: "Editar usuario",
          fr: "Modifier l'utilisateur",
          ja: "ユーザーを編集",
        }
      },
      {
        key: "ui.manage.users.remove_user",
        values: {
          en: "Remove user",
          de: "Benutzer entfernen",
          pl: "Usuń użytkownika",
          es: "Eliminar usuario",
          fr: "Supprimer l'utilisateur",
          ja: "ユーザーを削除",
        }
      },
      {
        key: "ui.manage.users.confirm_remove",
        values: {
          en: "Remove {email} from the organization?",
          de: "{email} aus der Organisation entfernen?",
          pl: "Usunąć {email} z organizacji?",
          es: "¿Eliminar {email} de la organización?",
          fr: "Supprimer {email} de l'organisation ?",
          ja: "{email}を組織から削除しますか？",
        }
      },
      {
        key: "ui.manage.users.remove_error",
        values: {
          en: "Error removing user.",
          de: "Fehler beim Entfernen des Benutzers.",
          pl: "Błąd podczas usuwania użytkownika.",
          es: "Error al eliminar usuario.",
          fr: "Erreur lors de la suppression de l'utilisateur.",
          ja: "ユーザーの削除中にエラーが発生しました。",
        }
      },
      {
        key: "ui.manage.users.no_members",
        values: {
          en: "No team members found",
          de: "Keine Teammitglieder gefunden",
          pl: "Nie znaleziono członków zespołu",
          es: "No se encontraron miembros del equipo",
          fr: "Aucun membre d'équipe trouvé",
          ja: "チームメンバーが見つかりません",
        }
      },
      {
        key: "ui.manage.users.limited_access",
        values: {
          en: "Limited Access",
          de: "Eingeschränkter Zugriff",
          pl: "Ograniczony dostęp",
          es: "Acceso limitado",
          fr: "Accès limité",
          ja: "制限されたアクセス",
        }
      },
      {
        key: "ui.manage.users.limited_access_message",
        values: {
          en: "As {role}, you can view team members but cannot send invitations.",
          de: "Als {role} kannst du Teammitglieder ansehen, aber keine Einladungen senden.",
          pl: "Jako {role} możesz wyświetlać członków zespołu, ale nie możesz wysyłać zaproszeń.",
          es: "Como {role}, puedes ver a los miembros del equipo pero no puedes enviar invitaciones.",
          fr: "En tant que {role}, vous pouvez voir les membres de l'équipe mais ne pouvez pas envoyer d'invitations.",
          ja: "{role}として、チームメンバーを表示できますが、招待を送信することはできません。",
        }
      },

      // === STATUS BADGES ===
      {
        key: "ui.manage.users.status.active",
        values: {
          en: "Active",
          de: "Aktiv",
          pl: "Aktywny",
          es: "Activo",
          fr: "Actif",
          ja: "アクティブ",
        }
      },
      {
        key: "ui.manage.users.status.inactive",
        values: {
          en: "Inactive",
          de: "Inaktiv",
          pl: "Nieaktywny",
          es: "Inactivo",
          fr: "Inactif",
          ja: "非アクティブ",
        }
      },
      {
        key: "ui.manage.users.status.pending",
        values: {
          en: "Pending",
          de: "Ausstehend",
          pl: "Oczekujące",
          es: "Pendiente",
          fr: "En attente",
          ja: "保留中",
        }
      },

      // === ROLE NAMES ===
      {
        key: "ui.manage.roles.super_admin",
        values: {
          en: "Super Admin",
          de: "Super-Admin",
          pl: "Super Administrator",
          es: "Super Administrador",
          fr: "Super Administrateur",
          ja: "スーパー管理者",
        }
      },
      {
        key: "ui.manage.roles.org_owner",
        values: {
          en: "Organization Owner",
          de: "Organisationsinhaber",
          pl: "Właściciel organizacji",
          es: "Propietario de la organización",
          fr: "Propriétaire de l'organisation",
          ja: "組織オーナー",
        }
      },
      {
        key: "ui.manage.roles.business_manager",
        values: {
          en: "Business Manager",
          de: "Business Manager",
          pl: "Menedżer biznesowy",
          es: "Gerente de negocios",
          fr: "Responsable commercial",
          ja: "ビジネスマネージャー",
        }
      },
      {
        key: "ui.manage.roles.employee",
        values: {
          en: "Employee",
          de: "Mitarbeiter",
          pl: "Pracownik",
          es: "Empleado",
          fr: "Employé",
          ja: "従業員",
        }
      },
      {
        key: "ui.manage.roles.viewer",
        values: {
          en: "Viewer",
          de: "Betrachter",
          pl: "Przeglądający",
          es: "Visor",
          fr: "Observateur",
          ja: "閲覧者",
        }
      },

      // === INVITE USER MODAL ===
      {
        key: "ui.manage.invite.title",
        values: {
          en: "Invite User",
          de: "Benutzer einladen",
          pl: "Zaproś użytkownika",
          es: "Invitar usuario",
          fr: "Inviter un utilisateur",
          ja: "ユーザーを招待",
        }
      },
      {
        key: "ui.manage.invite.email_address",
        values: {
          en: "Email Address",
          de: "E-Mail-Adresse",
          pl: "Adres e-mail",
          es: "Dirección de correo electrónico",
          fr: "Adresse e-mail",
          ja: "メールアドレス",
        }
      },
      {
        key: "ui.manage.invite.first_name",
        values: {
          en: "First Name",
          de: "Vorname",
          pl: "Imię",
          es: "Nombre",
          fr: "Prénom",
          ja: "名",
        }
      },
      {
        key: "ui.manage.invite.last_name",
        values: {
          en: "Last Name",
          de: "Nachname",
          pl: "Nazwisko",
          es: "Apellido",
          fr: "Nom de famille",
          ja: "姓",
        }
      },
      {
        key: "ui.manage.invite.select_role",
        values: {
          en: "Select a role...",
          de: "Rolle auswählen...",
          pl: "Wybierz rolę...",
          es: "Seleccionar un rol...",
          fr: "Sélectionner un rôle...",
          ja: "役割を選択...",
        }
      },
      {
        key: "ui.manage.invite.send_email",
        values: {
          en: "Send invitation email to user",
          de: "Einladungs-E-Mail an Benutzer senden",
          pl: "Wyślij e-mail z zaproszeniem do użytkownika",
          es: "Enviar correo de invitación al usuario",
          fr: "Envoyer un e-mail d'invitation à l'utilisateur",
          ja: "ユーザーに招待メールを送信",
        }
      },
      {
        key: "ui.manage.invite.inviting",
        values: {
          en: "Inviting...",
          de: "Wird eingeladen...",
          pl: "Zapraszanie...",
          es: "Invitando...",
          fr: "Invitation en cours...",
          ja: "招待中...",
        }
      },
      {
        key: "ui.manage.invite.send_invitation",
        values: {
          en: "Send Invitation",
          de: "Einladung senden",
          pl: "Wyślij zaproszenie",
          es: "Enviar invitación",
          fr: "Envoyer l'invitation",
          ja: "招待を送信",
        }
      },
      {
        key: "ui.manage.invite.success_title",
        values: {
          en: "Success!",
          de: "Erfolg!",
          pl: "Sukces!",
          es: "¡Éxito!",
          fr: "Succès !",
          ja: "成功！",
        }
      },
      {
        key: "ui.manage.invite.success_message",
        values: {
          en: "User invited successfully!",
          de: "Benutzer erfolgreich eingeladen!",
          pl: "Użytkownik zaproszony pomyślnie!",
          es: "¡Usuario invitado con éxito!",
          fr: "Utilisateur invité avec succès !",
          ja: "ユーザーが正常に招待されました！",
        }
      },
      {
        key: "ui.manage.invite.success_email_sent",
        values: {
          en: "An invitation email has been sent.",
          de: "Eine Einladungs-E-Mail wurde gesendet.",
          pl: "Wysłano e-mail z zaproszeniem.",
          es: "Se ha enviado un correo de invitación.",
          fr: "Un e-mail d'invitation a été envoyé.",
          ja: "招待メールが送信されました。",
        }
      },
      {
        key: "ui.manage.invite.error",
        values: {
          en: "Error",
          de: "Fehler",
          pl: "Błąd",
          es: "Error",
          fr: "Erreur",
          ja: "エラー",
        }
      },

      // === EDIT USER MODAL ===
      {
        key: "ui.manage.edit_user.title",
        values: {
          en: "Edit User",
          de: "Benutzer bearbeiten",
          pl: "Edytuj użytkownika",
          es: "Editar usuario",
          fr: "Modifier l'utilisateur",
          ja: "ユーザーを編集",
        }
      },
      {
        key: "ui.manage.edit_user.success_message",
        values: {
          en: "User updated successfully!",
          de: "Benutzer erfolgreich aktualisiert!",
          pl: "Użytkownik zaktualizowany pomyślnie!",
          es: "¡Usuario actualizado con éxito!",
          fr: "Utilisateur mis à jour avec succès !",
          ja: "ユーザーが正常に更新されました！",
        }
      },
      {
        key: "ui.manage.edit_user.invitation_pending",
        values: {
          en: "Invitation Pending",
          de: "Einladung ausstehend",
          pl: "Zaproszenie oczekujące",
          es: "Invitación pendiente",
          fr: "Invitation en attente",
          ja: "招待保留中",
        }
      },
      {
        key: "ui.manage.edit_user.invitation_pending_message",
        values: {
          en: "This user hasn't accepted their invitation yet.",
          de: "Dieser Benutzer hat die Einladung noch nicht akzeptiert.",
          pl: "Ten użytkownik nie zaakceptował jeszcze zaproszenia.",
          es: "Este usuario aún no ha aceptado su invitación.",
          fr: "Cet utilisateur n'a pas encore accepté son invitation.",
          ja: "このユーザーはまだ招待を受け入れていません。",
        }
      },
      {
        key: "ui.manage.edit_user.resending",
        values: {
          en: "Resending...",
          de: "Wird erneut gesendet...",
          pl: "Ponowne wysyłanie...",
          es: "Reenviando...",
          fr: "Renvoi en cours...",
          ja: "再送信中...",
        }
      },
      {
        key: "ui.manage.edit_user.resend_invitation",
        values: {
          en: "Resend Invitation",
          de: "Einladung erneut senden",
          pl: "Wyślij ponownie zaproszenie",
          es: "Reenviar invitación",
          fr: "Renvoyer l'invitation",
          ja: "招待を再送信",
        }
      },
      {
        key: "ui.manage.edit_user.invitation_sent",
        values: {
          en: "Invitation Sent!",
          de: "Einladung gesendet!",
          pl: "Zaproszenie wysłane!",
          es: "¡Invitación enviada!",
          fr: "Invitation envoyée !",
          ja: "招待が送信されました！",
        }
      },
      {
        key: "ui.manage.edit_user.invitation_resent_message",
        values: {
          en: "The invitation email has been resent to {email}",
          de: "Die Einladungs-E-Mail wurde erneut an {email} gesendet",
          pl: "E-mail z zaproszeniem został wysłany ponownie do {email}",
          es: "El correo de invitación se ha reenviado a {email}",
          fr: "L'e-mail d'invitation a été renvoyé à {email}",
          ja: "招待メールが{email}に再送信されました",
        }
      },
      {
        key: "ui.manage.edit_user.no_permission_role",
        values: {
          en: "You don't have permission to change roles",
          de: "Du hast keine Berechtigung, Rollen zu ändern",
          pl: "Nie masz uprawnień do zmiany ról",
          es: "No tienes permiso para cambiar roles",
          fr: "Vous n'avez pas la permission de changer les rôles",
          ja: "役割を変更する権限がありません",
        }
      },
      {
        key: "ui.manage.edit_user.save_changes",
        values: {
          en: "Save Changes",
          de: "Änderungen speichern",
          pl: "Zapisz zmiany",
          es: "Guardar cambios",
          fr: "Enregistrer les modifications",
          ja: "変更を保存",
        }
      },
    ];

    // Get all unique translation keys
    const allKeys = translations.map(t => t.key);

    // Efficiently check which translations already exist
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    // Insert only new translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            existingKeys,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "manage-window-users"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Users & Invites translations`);
    return { success: true, count };
  }
});
