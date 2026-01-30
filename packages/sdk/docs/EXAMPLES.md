# @l4yercak3/sdk Examples

Real-world examples for common use cases.

## Table of Contents

- [Event Registration Page](#event-registration-page)
- [Contact Form](#contact-form)
- [E-commerce Checkout](#e-commerce-checkout)
- [Event Check-in App](#event-check-in-app)
- [Invoice Dashboard](#invoice-dashboard)
- [Certificate Verification](#certificate-verification)
- [Member Portal](#member-portal)

---

## Event Registration Page

Complete event registration with ticket selection and checkout.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useEvents, useProducts, useCheckout } from '@l4yercak3/sdk/react';
import type { Event, Product } from '@l4yercak3/sdk';

interface EventRegistrationProps {
  eventId: string;
}

export function EventRegistration({ eventId }: EventRegistrationProps) {
  const { getEvent } = useEvents();
  const { products, fetchProducts } = useProducts();
  const { cart, addToCart, removeFromCart, updateQuantity, createCheckoutSession, isCreatingCheckout } = useCheckout();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const [eventData] = await Promise.all([
          getEvent(eventId, { includeProducts: true }),
          fetchProducts({ eventId, status: 'active' }),
        ]);
        setEvent(eventData);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  const handleCheckout = async () => {
    const session = await createCheckoutSession({
      successUrl: `${window.location.origin}/events/${eventId}/registration/success`,
      cancelUrl: `${window.location.origin}/events/${eventId}`,
    });
    window.location.href = session.checkoutUrl;
  };

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.priceInCents || 0) * item.quantity;
  }, 0);

  if (loading) {
    return <div className="animate-pulse">Loading event...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Event Header */}
      <div className="mb-8">
        {event.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="w-full h-64 object-cover rounded-lg mb-4"
          />
        )}
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="text-gray-600 mt-2">
          {new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <p className="text-gray-600">{event.location}</p>
        {event.description && (
          <p className="mt-4">{event.description}</p>
        )}
      </div>

      {/* Ticket Selection */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Select Tickets</h2>
        <div className="space-y-4">
          {products.map(product => {
            const cartItem = cart.find(item => item.productId === product.id);
            const quantity = cartItem?.quantity || 0;
            const isSoldOut = product.status === 'sold_out';

            return (
              <div
                key={product.id}
                className={`border rounded-lg p-4 ${isSoldOut ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ${(product.priceInCents / 100).toFixed(2)}
                    </p>
                    {isSoldOut ? (
                      <span className="text-red-500 text-sm">Sold Out</span>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          disabled={quantity === 0}
                          className="w-8 h-8 rounded border"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => addToCart(product.id, 1)}
                          disabled={product.maxPerOrder ? quantity >= product.maxPerOrder : false}
                          className="w-8 h-8 rounded border"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">
              ${(cartTotal / 100).toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isCreatingCheckout}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreatingCheckout ? 'Creating checkout...' : 'Proceed to Checkout'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Contact Form

Dynamic form that submits to LayerCake.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForms, useFormSubmissions } from '@l4yercak3/sdk/react';
import type { Form, FormField } from '@l4yercak3/sdk';

interface ContactFormProps {
  formId: string;
}

export function ContactForm({ formId }: ContactFormProps) {
  const { getForm } = useForms();
  const { submitForm, isSubmitting, error, clearError } = useFormSubmissions();

  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getForm(formId).then(setForm);
  }, [formId]);

  const handleChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitForm(formId, formData);
      setSubmitted(true);
    } catch {
      // Error is captured in error state
    }
  };

  if (!form) {
    return <div>Loading form...</div>;
  }

  if (submitted) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold text-green-600 mb-2">
          {form.settings.confirmationMessage || 'Thank you!'}
        </h2>
        <p className="text-gray-600">Your submission has been received.</p>
      </div>
    );
  }

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      name: field.name,
      required: field.required,
      placeholder: field.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleChange(field.name, e.target.value),
      value: formData[field.name] || '',
      className: 'w-full border rounded-lg px-3 py-2',
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps} rows={4} />;

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={formData[field.name] === opt.value}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name={field.name}
              checked={formData[field.name] === 'true'}
              onChange={(e) => handleChange(field.name, e.target.checked ? 'true' : 'false')}
              required={field.required}
            />
            {field.label}
          </label>
        );

      case 'email':
        return <input type="email" {...commonProps} />;

      case 'phone':
        return <input type="tel" {...commonProps} />;

      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return <input type="date" {...commonProps} />;

      default:
        return <input type="text" {...commonProps} />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      {form.description && (
        <p className="text-gray-600">{form.description}</p>
      )}

      {form.fields
        .sort((a, b) => a.order - b.order)
        .map(field => (
          <div key={field.id}>
            {field.type !== 'checkbox' && (
              <label htmlFor={field.id} className="block font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
            {field.helpText && (
              <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        ))}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3">
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : form.settings.submitButtonText || 'Submit'}
      </button>
    </form>
  );
}
```

---

## E-commerce Checkout

Product listing with shopping cart.

```tsx
'use client';

import { useEffect } from 'react';
import { useProducts, useCheckout } from '@l4yercak3/sdk/react';

export function ProductStore() {
  const { products, loading, fetchProducts } = useProducts();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    createCheckoutSession,
    isCreatingCheckout
  } = useCheckout();

  useEffect(() => {
    fetchProducts({ status: 'active' });
  }, []);

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.priceInCents || 0) * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    const session = await createCheckoutSession({
      successUrl: `${window.location.origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/shop`,
    });
    window.location.href = session.checkoutUrl;
  };

  return (
    <div className="flex gap-8">
      {/* Product Grid */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-6">Shop</h1>
        {loading ? (
          <div>Loading products...</div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product.id} className="border rounded-lg p-4">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded mb-4"
                  />
                )}
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{product.shortDescription}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold">${(product.priceInCents / 100).toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={product.status === 'sold_out'}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {product.status === 'sold_out' ? 'Sold Out' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shopping Cart Sidebar */}
      <div className="w-80 border-l pl-8">
        <div className="sticky top-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Cart ({cart.length})</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-sm text-red-600">
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;

                  return (
                    <div key={item.productId} className="flex gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          ${(product.priceInCents / 100).toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 border rounded"
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-6 h-6 border rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">${(cartTotal / 100).toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isCreatingCheckout}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingCheckout ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Event Check-in App

QR code scanning and attendee check-in.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAttendees } from '@l4yercak3/sdk/react';
import type { Attendee } from '@l4yercak3/sdk';

interface CheckInAppProps {
  eventId: string;
}

export function CheckInApp({ eventId }: CheckInAppProps) {
  const { attendees, loading, fetchAttendees, checkIn } = useAttendees();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'registered' | 'checked_in'>('registered');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendees(eventId);
  }, [eventId]);

  const handleCheckIn = async (attendeeId: string) => {
    setCheckingIn(attendeeId);
    try {
      await checkIn(eventId, attendeeId);
    } finally {
      setCheckingIn(null);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = search === '' ||
      a.contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
      a.contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
      a.contact.email.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || a.status === filter;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.status === 'checked_in').length,
    registered: attendees.filter(a => a.status === 'registered').length,
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-600">Total Registrations</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.checkedIn}</p>
          <p className="text-sm text-gray-600">Checked In</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.registered}</p>
          <p className="text-sm text-gray-600">Awaiting</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All</option>
          <option value="registered">Awaiting Check-in</option>
          <option value="checked_in">Checked In</option>
        </select>
      </div>

      {/* Attendee List */}
      {loading ? (
        <div>Loading attendees...</div>
      ) : (
        <div className="space-y-2">
          {filteredAttendees.map(attendee => (
            <AttendeeRow
              key={attendee.id}
              attendee={attendee}
              onCheckIn={() => handleCheckIn(attendee.id)}
              isCheckingIn={checkingIn === attendee.id}
            />
          ))}
          {filteredAttendees.length === 0 && (
            <p className="text-center text-gray-500 py-8">No attendees found</p>
          )}
        </div>
      )}
    </div>
  );
}

function AttendeeRow({
  attendee,
  onCheckIn,
  isCheckingIn
}: {
  attendee: Attendee;
  onCheckIn: () => void;
  isCheckingIn: boolean;
}) {
  const isCheckedIn = attendee.status === 'checked_in';

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${isCheckedIn ? 'bg-green-50' : ''}`}>
      <div>
        <p className="font-semibold">
          {attendee.contact.firstName} {attendee.contact.lastName}
        </p>
        <p className="text-sm text-gray-600">{attendee.contact.email}</p>
        <p className="text-sm text-gray-500">{attendee.ticketName}</p>
      </div>
      <div className="text-right">
        {isCheckedIn ? (
          <div>
            <span className="text-green-600 font-medium">Checked In</span>
            <p className="text-xs text-gray-500">
              {new Date(attendee.checkedInAt!).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <button
            onClick={onCheckIn}
            disabled={isCheckingIn}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {isCheckingIn ? 'Checking in...' : 'Check In'}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Invoice Dashboard

View and manage invoices.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useInvoices } from '@l4yercak3/sdk/react';
import type { Invoice, InvoiceStatus } from '@l4yercak3/sdk';

export function InvoiceDashboard() {
  const {
    invoices,
    loading,
    fetchInvoices,
    sendInvoice,
    markPaid,
    getPdf
  } = useInvoices();

  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSend = async (invoiceId: string) => {
    await sendInvoice(invoiceId);
    alert('Invoice sent!');
  };

  const handleMarkPaid = async (invoiceId: string) => {
    await markPaid(invoiceId, {
      paymentMethod: 'manual',
    });
  };

  const handleDownload = async (invoiceId: string) => {
    const { pdfUrl } = await getPdf(invoiceId);
    window.open(pdfUrl, '_blank');
  };

  const filteredInvoices = filter === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filter);

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
    void: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading ? (
        <div>Loading invoices...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Invoice #</th>
              <th className="text-left py-3">Customer</th>
              <th className="text-left py-3">Amount</th>
              <th className="text-left py-3">Due Date</th>
              <th className="text-left py-3">Status</th>
              <th className="text-right py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id} className="border-b">
                <td className="py-3 font-mono">{invoice.number}</td>
                <td className="py-3">
                  {invoice.organization?.name ||
                   `${invoice.contact?.firstName} ${invoice.contact?.lastName}`}
                </td>
                <td className="py-3 font-semibold">
                  ${(invoice.totalInCents / 100).toFixed(2)}
                </td>
                <td className="py-3">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="py-3 text-right space-x-2">
                  <button
                    onClick={() => handleDownload(invoice.id)}
                    className="text-blue-600 hover:underline"
                  >
                    PDF
                  </button>
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => handleSend(invoice.id)}
                      className="text-green-600 hover:underline"
                    >
                      Send
                    </button>
                  )}
                  {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
                    <button
                      onClick={() => handleMarkPaid(invoice.id)}
                      className="text-green-600 hover:underline"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## Certificate Verification

Public certificate verification page.

```tsx
'use client';

import { useState } from 'react';
import { useCertificates } from '@l4yercak3/sdk/react';
import type { Certificate } from '@l4yercak3/sdk';

export function CertificateVerification() {
  const { verifyCertificate, loading } = useCertificates();
  const [certNumber, setCertNumber] = useState('');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCertificate(null);

    try {
      const cert = await verifyCertificate(certNumber);
      setCertificate(cert);
    } catch {
      setError('Certificate not found. Please check the certificate number and try again.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-center mb-8">
        Certificate Verification
      </h1>

      <form onSubmit={handleVerify} className="mb-8">
        <label className="block mb-2 font-medium">
          Enter Certificate Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
            placeholder="CERT-2024-0001"
            className="flex-1 border rounded-lg px-4 py-2 font-mono"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-8">
          {error}
        </div>
      )}

      {certificate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xl font-semibold text-green-600">
              Valid Certificate
            </span>
          </div>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Certificate Number</dt>
              <dd className="font-mono font-semibold">{certificate.certificateNumber}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Recipient</dt>
              <dd className="font-semibold">{certificate.recipientName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="capitalize">{certificate.type.replace('_', ' ')}</dd>
            </div>
            {certificate.courseName && (
              <div>
                <dt className="text-sm text-gray-500">Course/Program</dt>
                <dd>{certificate.courseName}</dd>
              </div>
            )}
            {certificate.eventName && (
              <div>
                <dt className="text-sm text-gray-500">Event</dt>
                <dd>{certificate.eventName}</dd>
              </div>
            )}
            {certificate.credits && (
              <div>
                <dt className="text-sm text-gray-500">Credits</dt>
                <dd>{certificate.credits} {certificate.creditType || 'credits'}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Issue Date</dt>
              <dd>{new Date(certificate.issueDate).toLocaleDateString()}</dd>
            </div>
            {certificate.expiryDate && (
              <div>
                <dt className="text-sm text-gray-500">Expiry Date</dt>
                <dd>{new Date(certificate.expiryDate).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>

          {certificate.pdfUrl && (
            <a
              href={certificate.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download Certificate PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Member Portal

Benefit claims and commission tracking.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useBenefitClaims, useCommissions } from '@l4yercak3/sdk/react';

interface MemberPortalProps {
  memberId: string;
}

export function MemberPortal({ memberId }: MemberPortalProps) {
  const [tab, setTab] = useState<'claims' | 'commissions'>('claims');

  const {
    claims,
    loading: claimsLoading,
    fetchClaims,
    createClaim
  } = useBenefitClaims();

  const {
    commissions,
    loading: commissionsLoading,
    fetchCommissions
  } = useCommissions();

  useEffect(() => {
    fetchClaims({ memberId });
    fetchCommissions({ memberId });
  }, [memberId]);

  const handleSubmitClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    await createClaim({
      memberId,
      benefitType: form.get('benefitType') as string,
      amountInCents: Math.round(parseFloat(form.get('amount') as string) * 100),
      description: form.get('description') as string,
    });

    e.currentTarget.reset();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Member Portal</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setTab('claims')}
          className={`px-4 py-2 font-medium ${tab === 'claims' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Benefit Claims
        </button>
        <button
          onClick={() => setTab('commissions')}
          className={`px-4 py-2 font-medium ${tab === 'commissions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Commissions
        </button>
      </div>

      {tab === 'claims' && (
        <div>
          {/* Submit Claim Form */}
          <form onSubmit={handleSubmitClaim} className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-4">Submit New Claim</h3>
            <div className="grid grid-cols-3 gap-4">
              <select name="benefitType" required className="border rounded px-3 py-2">
                <option value="">Select type...</option>
                <option value="medical">Medical</option>
                <option value="dental">Dental</option>
                <option value="vision">Vision</option>
                <option value="wellness">Wellness</option>
              </select>
              <input
                type="number"
                name="amount"
                step="0.01"
                placeholder="Amount"
                required
                className="border rounded px-3 py-2"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                Submit Claim
              </button>
            </div>
            <textarea
              name="description"
              placeholder="Description (optional)"
              className="w-full mt-2 border rounded px-3 py-2"
              rows={2}
            />
          </form>

          {/* Claims List */}
          {claimsLoading ? (
            <div>Loading claims...</div>
          ) : (
            <div className="space-y-3">
              {claims.map(claim => (
                <div key={claim.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{claim.benefitType}</p>
                      <p className="text-sm text-gray-600">{claim.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${(claim.amountInCents / 100).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        claim.status === 'paid' ? 'bg-green-100 text-green-800' :
                        claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'commissions' && (
        <div>
          {commissionsLoading ? (
            <div>Loading commissions...</div>
          ) : (
            <div className="space-y-3">
              {commissions.map(commission => (
                <div key={commission.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{commission.commissionType}</p>
                      <p className="text-sm text-gray-600">
                        {commission.processedAt && new Date(commission.processedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +${(commission.amountInCents / 100).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        commission.status === 'completed' ? 'bg-green-100 text-green-800' :
                        commission.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {commission.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```
