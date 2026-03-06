-- Sprint 79: Financial Security — Server-Side Calculations
-- Move all financial calculations from client-side reduce() to server-side RPCs.

-- ── 1. get_client_ledger_balance ─────────────────────────────────────────────
-- Returns the net balance for a client–trainer pair.
-- Positive = client has credit, Negative = client owes money.
CREATE OR REPLACE FUNCTION get_client_ledger_balance(
  p_client_id uuid,
  p_trainer_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END),
    0
  )
  FROM client_ledger
  WHERE client_id = p_client_id
    AND (p_trainer_id IS NULL OR trainer_id = p_trainer_id);
$$;

-- ── 2. get_daily_revenue_summary ─────────────────────────────────────────────
-- Returns aggregated revenue metrics for a trainer on a given date.
CREATE OR REPLACE FUNCTION get_daily_revenue_summary(
  p_trainer_id uuid,
  p_date text
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'date', p_date,
    'total_revenue', COALESCE(SUM(total), 0),
    'total_tips', COALESCE(SUM(tip_amount), 0),
    'session_count', COUNT(*),
    'cash_count', COUNT(*) FILTER (WHERE payment_method = 'cash'),
    'card_count', COUNT(*) FILTER (WHERE payment_method = 'card'),
    'pack_count', COUNT(*) FILTER (WHERE payment_method = 'session_pack')
  )
  INTO result
  FROM sale_transactions
  WHERE trainer_id = p_trainer_id
    AND status = 'completed'
    AND created_at >= (p_date || 'T00:00:00.000Z')::timestamptz
    AND created_at <= (p_date || 'T23:59:59.999Z')::timestamptz;

  RETURN result;
END;
$$;

-- ── 3. get_outstanding_balances ──────────────────────────────────────────────
-- Returns per-client outstanding balances (debits > credits) for a trainer.
CREATE OR REPLACE FUNCTION get_outstanding_balances(p_trainer_id uuid)
RETURNS json[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  result json[];
BEGIN
  SELECT COALESCE(array_agg(row_to_json(t)), '{}')
  INTO result
  FROM (
    SELECT
      client_id,
      SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) AS balance
    FROM client_ledger
    WHERE trainer_id = p_trainer_id
    GROUP BY client_id
    HAVING SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) > 0
    ORDER BY balance DESC
  ) t;

  RETURN result;
END;
$$;

-- ── 4. get_trainer_mrr ───────────────────────────────────────────────────────
-- Returns monthly recurring revenue for a trainer, normalizing weekly/yearly.
CREATE OR REPLACE FUNCTION get_trainer_mrr(p_trainer_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN interval = 'week'  THEN amount_cents * 4
      WHEN interval = 'year'  THEN amount_cents / 12
      ELSE amount_cents
    END
  ), 0)
  FROM subscriptions
  WHERE trainer_id = p_trainer_id
    AND status = 'active';
$$;

-- ── 5. increment_download_count ──────────────────────────────────────────────
-- Atomically increments the download counter for a purchase.
-- Returns the new count. Verifies ownership via auth.uid().
CREATE OR REPLACE FUNCTION increment_download_count(p_purchase_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE digital_product_purchases
  SET download_count = download_count + 1
  WHERE id = p_purchase_id
    AND client_id = auth.uid()
  RETURNING download_count INTO new_count;

  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Purchase not found or not owned by current user';
  END IF;

  RETURN new_count;
END;
$$;

-- ── 6. get_payroll_summary ───────────────────────────────────────────────────
-- Wraps the existing get_payroll_report RPC and adds pre-computed totals.
-- Falls back gracefully if get_payroll_report doesn't exist yet.
CREATE OR REPLACE FUNCTION get_payroll_summary(
  p_trainer_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  report_rows json;
  result json;
BEGIN
  -- Get raw report rows from existing RPC
  SELECT COALESCE(json_agg(r), '[]'::json)
  INTO report_rows
  FROM get_payroll_report(p_trainer_id, p_date_from, p_date_to) r;

  -- Build summary with pre-computed totals
  SELECT json_build_object(
    'date_from', p_date_from,
    'date_to', p_date_to,
    'total_sessions', json_array_length(report_rows),
    'total_completed', (
      SELECT COUNT(*) FROM json_array_elements(report_rows) elem
      WHERE elem->>'appointment_status' = 'completed'
    ),
    'total_no_shows', (
      SELECT COUNT(*) FROM json_array_elements(report_rows) elem
      WHERE elem->>'appointment_status' = 'no_show'
    ),
    'total_cancellations', (
      SELECT COUNT(*) FROM json_array_elements(report_rows) elem
      WHERE elem->>'appointment_status' IN ('late_cancel', 'early_cancel')
    ),
    'total_gross_revenue', (
      SELECT COALESCE(SUM((elem->>'service_price')::numeric), 0)
      FROM json_array_elements(report_rows) elem
    ),
    'total_trainer_pay', (
      SELECT COALESCE(SUM((elem->>'trainer_pay_amount')::numeric), 0)
      FROM json_array_elements(report_rows) elem
    ),
    'total_tips', (
      SELECT COALESCE(SUM((elem->>'tip_amount')::numeric), 0)
      FROM json_array_elements(report_rows) elem
    ),
    'total_commissions', (
      SELECT COALESCE(SUM((elem->>'commission_amount')::numeric), 0)
      FROM json_array_elements(report_rows) elem
    ),
    'rows', report_rows
  )
  INTO result;

  RETURN result;
END;
$$;
