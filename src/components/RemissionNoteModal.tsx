import React, { useRef } from 'react';
import { Portal } from './Portal';
import { Sale } from '../types';
import { X, Printer, FileText, Share2, Mail } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface RemissionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const RemissionNoteModal: React.FC<RemissionNoteModalProps> = ({
  isOpen,
  onClose,
  sale
}) => {
  const { showToast } = useToast();
  const { company } = useAuth();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const formatDateToSpanish = (dateStr: string) => {
    if (!dateStr) return '';
    
    // Parse to ensure we use local timezone details
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getDate();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFeaturePlaceholder = (feature: string) => {
    showToast('info', 'Próximamente', `La función de ${feature} estará disponible muy pronto.`);
  };

  const subtotal = sale.subtotal;
  const tax = sale.tax;
  const total = sale.total;
  const hasTax = tax > 0;

  // Group products by group name, maintaining order of appearance
  const orderedGroups: string[] = [];
  const groupedItems: { [key: string]: typeof sale.items } = {};

  sale.items.forEach(item => {
    const groupName = item.groupName || 'Sin Grupo';
    if (!orderedGroups.includes(groupName)) {
      orderedGroups.push(groupName);
    }
    if (!groupedItems[groupName]) {
      groupedItems[groupName] = [];
    }
    groupedItems[groupName].push(item);
  });

  return (
    <Portal>
      {/* Global CSS Inject to support print styling cleanly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '24px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto'
        }}
      >
        {/* Modal Wrapper */}
        <div
          style={{
            width: '100%',
            maxWidth: '850px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: '40px'
          }}
        >
          {/* Top Actions Bar (Hidden on Print) */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Acciones rápidas:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handlePrint}
                  title="Imprimir nota"
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#334155'}
                >
                  <Printer size={15} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => handleFeaturePlaceholder('exportar a PDF')}
                  title="Exportar a PDF"
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#334155'}
                >
                  <FileText size={15} />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleFeaturePlaceholder('compartir por WhatsApp')}
                  title="Compartir por WhatsApp"
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#334155'}
                >
                  <Share2 size={15} />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => handleFeaturePlaceholder('enviar por correo')}
                  title="Enviar por correo"
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#334155'}
                >
                  <Mail size={15} />
                  <span>Correo</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Clean Enterprise Remission Note Sheet (White Background) */}
          <div
            ref={printAreaRef}
            className="print-container"
            style={{
              backgroundColor: '#ffffff',
              color: '#1e293b',
              padding: '48px',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.5,
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Info section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '40px',
                gap: '24px'
              }}
            >
              {/* Logo / Company Identity Placeholder structure */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.025em', color: '#0f172a' }}>
                  {company?.name || 'Kora ERP'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Sistema de Gestión Empresarial
                </div>
                {/* Future Hook: Company Fiscal Address, etc. */}
                {/* <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>R.F.C: ...</div> */}
              </div>

              {/* Account, Date, Folio Header Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  textAlign: 'right'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  {sale.customerName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {formatDateToSpanish(sale.createdAt)}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0284c7',
                    backgroundColor: '#f0f9ff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    marginTop: '8px',
                    border: '1px solid #bae6fd',
                    display: 'inline-block'
                  }}
                >
                  {sale.folio || sale.id.substring(0, 8)}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '36px'
              }}
            >
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: '#0f172a',
                  margin: 0,
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px',
                  display: 'inline-block',
                  minWidth: '240px'
                }}
              >
                NOTA DE REMISIÓN
              </h1>
            </div>

            {/* Products Grouped Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {orderedGroups.map((groupName) => {
                const groupItems = groupedItems[groupName];
                const groupSubtotal = groupItems.reduce((sum, item) => sum + item.subtotal, 0);

                return (
                  <div key={groupName} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Elegant Group Header */}
                    <div
                      style={{
                        borderBottom: '2px solid #0f172a',
                        paddingBottom: '4px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.075em',
                          color: '#0f172a',
                          textTransform: 'uppercase'
                        }}
                      >
                        {groupName}
                      </span>
                    </div>

                    {/* Table for this group */}
                    <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #94a3b8' }}>
                            <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', width: '70px', textAlign: 'center' }}>
                              CANTIDAD
                            </th>
                            <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                              PRODUCTO
                            </th>
                            <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', width: '120px', textAlign: 'right' }}>
                              PRECIO UNITARIO
                            </th>
                            <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', width: '120px', textAlign: 'right' }}>
                              IMPORTE
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map((item, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: '1px solid #f1f5f9'
                              }}
                            >
                              <td style={{ padding: '8px', fontSize: '12px', textAlign: 'center', fontWeight: 500 }}>
                                {item.quantity}
                              </td>
                              <td style={{ padding: '8px', fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
                                {item.productName}
                              </td>
                              <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right', color: '#475569' }}>
                                ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                ${item.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Group Subtotal row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        color: '#475569',
                        fontWeight: 600,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        alignSelf: 'flex-end',
                        minWidth: '220px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span style={{ textTransform: 'none' }}>Subtotal {groupName}</span>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        ${groupSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary & Details Column Grid */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '40px',
                flexWrap: 'wrap-reverse'
              }}
            >
              {/* Payment Conditions & Notes */}
              <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Conditions */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Condiciones de Pago
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {sale.paymentMethod}
                  </div>
                </div>

                {/* Observations */}
                {sale.notes && sale.notes.trim() !== '' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      Observaciones
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        backgroundColor: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {sale.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 500 }}>
                    ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {hasTax && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>IVA</span>
                    <span style={{ fontWeight: 500 }}>
                      ${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    borderTop: '2px solid #0f172a',
                    paddingTop: '8px',
                    marginTop: '4px'
                  }}
                >
                  <span>TOTAL</span>
                  <span>
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtle aesthetic lines / Footer decoration */}
            <div
              style={{
                marginTop: '60px',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8'
              }}
            >
              Esta es una representación impresa de una nota de remisión para consulta interna.
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
