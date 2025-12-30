-- Add RLS policy for customers to view their own fraud detection results
CREATE POLICY "Users can view their fraud results"
ON public.fraud_detection_results
FOR SELECT
USING (claim_id IN (
  SELECT id FROM claims WHERE user_id = auth.uid()
));