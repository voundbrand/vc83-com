/**
 * PRODUCTS TRANSLATION SEED DATA - SPANISH (es)
 *
 * Spanish translations for Product UI text.
 * Run with: npx convex run translations/seedProductTranslations_es:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const spanishTranslations = [
  // PRODUCTS WINDOW - MAIN HEADER
  { key: "ui.products.header.title", value: "Productos" },
  { key: "ui.products.header.description", value: "Gestiona tu catálogo de productos - entradas, mercancía y productos digitales" },
  { key: "ui.products.button.createProduct", value: "Crear producto" },
  { key: "ui.products.button.backToList", value: "Volver a la lista" },
  { key: "ui.products.loading", value: "Cargando productos..." },
  { key: "ui.products.error.login", value: "Inicia sesión para acceder a los productos" },
  { key: "ui.products.error.noOrg", value: "No se ha seleccionado ninguna organización" },
  { key: "ui.products.error.noOrgDescription", value: "Selecciona una organización para gestionar productos" },

  // PRODUCTS LIST
  { key: "ui.products.list.empty", value: "No hay productos. Haz clic en \"Crear producto\" para comenzar." },
  { key: "ui.products.list.filter.allTypes", value: "Todos los tipos" },
  { key: "ui.products.list.filter.tickets", value: "Entradas" },
  { key: "ui.products.list.filter.physical", value: "Físicos" },
  { key: "ui.products.list.filter.digital", value: "Digitales" },
  { key: "ui.products.list.filter.allStatuses", value: "Todos los estados" },
  { key: "ui.products.list.status.draft", value: "Borrador" },
  { key: "ui.products.list.status.active", value: "Activo" },
  { key: "ui.products.list.status.soldOut", value: "Agotado" },
  { key: "ui.products.list.status.archived", value: "Archivado" },
  { key: "ui.products.list.label.price", value: "Precio:" },
  { key: "ui.products.list.label.stock", value: "Stock:" },
  { key: "ui.products.list.label.sold", value: "Vendido:" },
  { key: "ui.products.list.button.edit", value: "Editar" },
  { key: "ui.products.list.button.delete", value: "Eliminar" },
  { key: "ui.products.list.button.publish", value: "Publicar" },

  // PRODUCT FORM
  { key: "ui.products.form.title.create", value: "Crear nuevo producto" },
  { key: "ui.products.form.title.edit", value: "Editar producto" },
  { key: "ui.products.form.basicInfo", value: "Información básica" },
  { key: "ui.products.form.name.label", value: "Nombre del producto" },
  { key: "ui.products.form.name.placeholder", value: "ej. Entrada VIP, Camiseta, Curso digital" },
  { key: "ui.products.form.type.label", value: "Tipo de producto" },
  { key: "ui.products.form.type.ticket", value: "Entrada (acceso a eventos)" },
  { key: "ui.products.form.type.physical", value: "Físico (mercancía, productos)" },
  { key: "ui.products.form.type.digital", value: "Digital (descargas, licencias)" },
  { key: "ui.products.form.description.label", value: "Descripción" },
  { key: "ui.products.form.description.placeholder", value: "Describe el producto..." },

  // PRICING
  { key: "ui.products.form.pricing", value: "Precios e inventario" },
  { key: "ui.products.form.price.label", value: "Precio" },
  { key: "ui.products.form.price.placeholder", value: "0.00" },
  { key: "ui.products.form.currency.label", value: "Moneda" },
  { key: "ui.products.form.taxRate.label", value: "Tipo impositivo (%)" },
  { key: "ui.products.form.taxRate.placeholder", value: "0" },
  { key: "ui.products.form.inventory.label", value: "Stock disponible" },
  { key: "ui.products.form.inventory.placeholder", value: "0" },
  { key: "ui.products.form.inventory.unlimited", value: "Stock ilimitado" },

  // TICKET SPECIFIC
  { key: "ui.products.form.ticketSettings", value: "Configuración de entrada" },
  { key: "ui.products.form.ticket.eventId.label", value: "Evento" },
  { key: "ui.products.form.ticket.eventId.placeholder", value: "Seleccionar evento (opcional)" },
  { key: "ui.products.form.ticket.validFrom.label", value: "Válido desde" },
  { key: "ui.products.form.ticket.validUntil.label", value: "Válido hasta" },
  { key: "ui.products.form.ticket.seatInfo.label", value: "Información de asiento" },
  { key: "ui.products.form.ticket.seatInfo.placeholder", value: "ej. Sección A, Fila 5, Asiento 12" },

  // DIGITAL SPECIFIC
  { key: "ui.products.form.digitalSettings", value: "Configuración de producto digital" },
  { key: "ui.products.form.digital.downloadUrl.label", value: "URL de descarga" },
  { key: "ui.products.form.digital.downloadUrl.placeholder", value: "https://..." },
  { key: "ui.products.form.digital.fileSize.label", value: "Tamaño de archivo (MB)" },
  { key: "ui.products.form.digital.fileSize.placeholder", value: "0" },
  { key: "ui.products.form.digital.licenseKey.label", value: "Clave de licencia (opcional)" },
  { key: "ui.products.form.digital.licenseKey.placeholder", value: "XXXX-XXXX-XXXX-XXXX" },

  // ADD-ONS
  { key: "ui.products.form.addons", value: "Complementos" },
  { key: "ui.products.form.addons.description", value: "Crea productos adicionales que los clientes puedan agregar durante la compra." },
  { key: "ui.products.form.addons.button.manage", value: "Gestionar complementos" },
  { key: "ui.products.form.addons.count", value: "complementos" },

  // STATUS & PUBLISHING
  { key: "ui.products.form.status", value: "Estado y publicación" },
  { key: "ui.products.form.status.label", value: "Estado del producto" },
  { key: "ui.products.form.status.description", value: "Controla la visibilidad del producto" },
  { key: "ui.products.form.featured.label", value: "Producto destacado" },
  { key: "ui.products.form.featured.description", value: "Muestra este producto en secciones destacadas" },

  // INVOICING
  { key: "ui.products.form.invoicing", value: "Configuración de facturación" },
  { key: "ui.products.form.invoicing.description", value: "Configura cómo aparece este producto en las facturas de Stripe" },
  { key: "ui.products.form.invoicing.button.configure", value: "Configurar facturación" },

  // ACTIONS
  { key: "ui.products.button.save", value: "Guardar" },
  { key: "ui.products.button.cancel", value: "Cancelar" },
  { key: "ui.products.button.update", value: "Actualizar" },
  { key: "ui.products.button.create", value: "Crear" },
  { key: "ui.products.saving", value: "Guardando..." },
  { key: "ui.products.required", value: "*" },

  // CHECKOUT
  { key: "ui.products.checkout.title", value: "Carrito" },
  { key: "ui.products.checkout.empty", value: "Tu carrito está vacío" },
  { key: "ui.products.checkout.item", value: "Artículo" },
  { key: "ui.products.checkout.quantity", value: "Cantidad" },
  { key: "ui.products.checkout.price", value: "Precio" },
  { key: "ui.products.checkout.subtotal", value: "Subtotal" },
  { key: "ui.products.checkout.tax", value: "Impuesto" },
  { key: "ui.products.checkout.tax.included", value: "incluido" },
  { key: "ui.products.checkout.tax.added", value: "añadido" },
  { key: "ui.products.checkout.total", value: "Total" },
  { key: "ui.products.checkout.button.proceed", value: "Proceder al pago" },
  { key: "ui.products.checkout.footer.secure", value: "Pago seguro con Stripe" },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Spanish (es) Product translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of spanishTranslations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        "es", // Spanish locale
        "products"
      );
      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(
      `✅ Spanish product translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: spanishTranslations.length,
      locale: "es",
    };
  },
});
