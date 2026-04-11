'use client'

import { Snackbar, Alert } from '@mui/material'

interface Props {
  open: boolean
  message: string
  severity?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  autoHideDuration?: number
}

const SnackbarMessage = ({ open, message, severity = 'info', onClose, autoHideDuration = 3000 }: Props) => {
  return (
    <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default SnackbarMessage
