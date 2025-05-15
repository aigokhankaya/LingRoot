import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const InputSection = () => {
  return (
    <div>
      {/* Yeni içerik türü kutuları */}
      <Box>
        <Button>Öneriler</Button>
        <Typography variant="caption">Yakında ilginç konu önerileri burada görünecek.</Typography>
      </Box>
      <Box>
        <Button>Hashtag</Button>
        <Typography variant="caption">Takip ettiğiniz hashtag'lere göre öneriler burada listelenecek.</Typography>
      </Box>
    </div>
  );
};

export default InputSection; 